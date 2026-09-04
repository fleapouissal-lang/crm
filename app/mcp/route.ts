import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { getPublicOrigin } from "@/lib/mcp/origin";
import {
  createMcpSession,
  getMcpSession,
  pruneExpiredMcpSessions,
  removeMcpSession,
} from "@/lib/mcp/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version, MCP-Session-Id",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function authFailure(request: Request, status: 401 | 403, message: string) {
  const metadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    getPublicOrigin(request)
  );
  const headers = new Headers(corsHeaders);
  if (status === 401) {
    headers.set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${metadataUrl.toString()}", scope="openid email profile"`
    );
  }
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    { status, headers }
  );
}

function protocolFailure(status: 400 | 403 | 404, message: string) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message }, id: null },
    { status, headers: corsHeaders }
  );
}

function isInitializationRequest(body: unknown) {
  const messages = Array.isArray(body) ? body : [body];
  return messages.some(
    (message) =>
      message !== null &&
      typeof message === "object" &&
      "method" in message &&
      message.method === "initialize"
  );
}

async function handleMcpRequest(request: Request) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.ok) return authFailure(request, auth.status, auth.message);

  try {
    await pruneExpiredMcpSessions();
    const baseUrl = getPublicOrigin(request);
    const sessionId = request.headers.get("mcp-session-id");
    let session = sessionId
      ? getMcpSession(sessionId, auth.context)
      : null;

    if (sessionId && !session) {
      return protocolFailure(404, "MCP session not found");
    }

    if (!session && request.method === "POST") {
      let body: unknown;
      try {
        body = await request.clone().json();
      } catch {
        return protocolFailure(400, "Invalid JSON-RPC request body");
      }
      if (!isInitializationRequest(body)) {
        return protocolFailure(400, "MCP session must be initialized first");
      }
      session = await createMcpSession(auth.context, baseUrl);
    }

    if (!session) {
      return protocolFailure(400, "MCP session id is required");
    }

    const response = withCors(await session.transport.handleRequest(request));
    if (request.method === "DELETE" && sessionId) {
      removeMcpSession(sessionId);
    }
    return response;
  } catch (error) {
    console.error("[mcp] request failed", {
      method: request.method,
      path: new URL(request.url).pathname,
      error,
    });
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal MCP server error" },
        id: null,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
