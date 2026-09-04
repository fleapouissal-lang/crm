import { randomUUID } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpAuthContext } from "@/lib/mcp/auth";
import { createFusionLeapMcpServer } from "@/lib/mcp/server";

const SESSION_TTL_MS = 30 * 60 * 1000;

export type FusionLeapMcpSession = {
  context: McpAuthContext;
  lastUsedAt: number;
  server: McpServer;
  sessionId?: string;
  transport: WebStandardStreamableHTTPServerTransport;
};

type McpGlobalState = typeof globalThis & {
  __fusionLeapMcpSessions?: Map<string, FusionLeapMcpSession>;
};

const globalState = globalThis as McpGlobalState;
const sessions =
  globalState.__fusionLeapMcpSessions ??
  (globalState.__fusionLeapMcpSessions = new Map());

function samePrincipal(
  session: FusionLeapMcpSession,
  context: McpAuthContext
) {
  return (
    session.context.user.id === context.user.id &&
    session.context.clientId === context.clientId &&
    session.context.profile.organization_id === context.profile.organization_id
  );
}

export async function createMcpSession(
  context: McpAuthContext,
  baseUrl: string
) {
  const sessionRef: { current?: FusionLeapMcpSession } = {};
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: randomUUID,
    onsessioninitialized(sessionId) {
      const session = sessionRef.current;
      if (!session) return;
      session.sessionId = sessionId;
      sessions.set(sessionId, session);
    },
  });
  const server = createFusionLeapMcpServer(context, baseUrl);
  const session: FusionLeapMcpSession = {
    context,
    lastUsedAt: Date.now(),
    server,
    transport,
  };
  sessionRef.current = session;
  await server.connect(transport);
  return session;
}

export function getMcpSession(
  sessionId: string,
  context: McpAuthContext
): FusionLeapMcpSession | null {
  const session = sessions.get(sessionId);
  if (!session || !samePrincipal(session, context)) return null;

  // OAuth access tokens can be refreshed during a long-lived MCP session.
  // Keep the server closures on the same context object while replacing its
  // authenticated Supabase client and current profile for every request.
  Object.assign(session.context, context);
  session.lastUsedAt = Date.now();
  return session;
}

export function removeMcpSession(sessionId: string) {
  sessions.delete(sessionId);
}

export async function pruneExpiredMcpSessions(now = Date.now()) {
  const expired = [...sessions.entries()].filter(
    ([, session]) => now - session.lastUsedAt > SESSION_TTL_MS
  );
  await Promise.allSettled(
    expired.map(async ([sessionId, session]) => {
      sessions.delete(sessionId);
      await session.server.close();
    })
  );
}

export function clearMcpSessionsForTests() {
  sessions.clear();
}
