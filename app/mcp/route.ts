import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { getPublicOrigin } from "@/lib/mcp/origin";
import { createFusionLeapMcpServer } from "@/lib/mcp/server";

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

async function handleMcpRequest(request: Request) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.ok) return authFailure(request, auth.status, auth.message);

  const baseUrl = getPublicOrigin(request);
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createFusionLeapMcpServer(auth.context, baseUrl);
  await server.connect(transport);

  try {
    return withCors(await transport.handleRequest(request));
  } catch (error) {
    console.error("[mcp] request failed", error);
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
