import assert from "node:assert/strict";
import test from "node:test";
import type { McpAuthContext } from "@/lib/mcp/auth";
import {
  clearMcpSessionsForTests,
  createMcpSession,
  getMcpSession,
  removeMcpSession,
} from "@/lib/mcp/session";

function authContext(userId = "user-1"): McpAuthContext {
  return {
    accessToken: "test-token",
    clientId: "test-client",
    profile: {
      id: userId,
      full_name: "Test User",
      role: "admin",
      organization_id: "org-1",
    } as McpAuthContext["profile"],
    supabase: {} as McpAuthContext["supabase"],
    user: { id: userId } as McpAuthContext["user"],
  };
}

function request(body: unknown, sessionId?: string) {
  const headers = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "mcp-protocol-version": "2025-06-18",
  });
  if (sessionId) headers.set("mcp-session-id", sessionId);
  return new Request("https://crm.example/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

test("keeps an initialized MCP transport for later tool calls", async () => {
  clearMcpSessionsForTests();
  const context = authContext();
  const session = await createMcpSession(context, "https://crm.example");

  const initialized = await session.transport.handleRequest(
    request({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    })
  );
  const sessionId = initialized.headers.get("mcp-session-id");
  assert.equal(initialized.status, 200);
  assert.ok(sessionId);

  const stored = getMcpSession(sessionId, authContext());
  assert.equal(stored, session);
  const called = await stored.transport.handleRequest(
    request(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "get_current_user", arguments: {} },
      },
      sessionId
    )
  );
  const payload = await called.json();
  assert.equal(called.status, 200);
  assert.equal(payload.result.structuredContent.id, "user-1");

  removeMcpSession(sessionId);
  await session.server.close();
});

test("does not share an MCP session across users", async () => {
  clearMcpSessionsForTests();
  const session = await createMcpSession(authContext(), "https://crm.example");
  const initialized = await session.transport.handleRequest(
    request({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    })
  );
  const sessionId = initialized.headers.get("mcp-session-id");
  assert.ok(sessionId);
  assert.equal(getMcpSession(sessionId, authContext("user-2")), null);

  removeMcpSession(sessionId);
  await session.server.close();
});
