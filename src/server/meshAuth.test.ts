import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  AgentTokenStore,
  clientIp,
  createMeshAuth,
  extractBearer,
  getOperatorToken,
  isAuthorizedUpgrade,
} from "./meshAuth";

process.env.MESH_OPERATOR_TOKEN = "op-test-token-not-secret";
const OP = { authorization: "Bearer op-test-token-not-secret" };

function run(auth: ReturnType<typeof createMeshAuth>, req: any) {
  let status = 200;
  let body: any = null;
  let nextCalled = false;
  const res = {
    status(code: number) { status = code; return this; },
    json(payload: any) { body = payload; return this; },
  };
  const fullReq = { query: {}, body: {}, headers: {}, ...req };
  auth(fullReq, res, () => { nextCalled = true; });
  return { status, body, nextCalled, req: fullReq };
}

describe("extractBearer", () => {
  test("accepts exactly one bearer token", () => {
    assert.equal(extractBearer("Bearer abc"), "abc");
    assert.equal(extractBearer("Basic abc"), null);
    assert.equal(extractBearer("Bearer a b"), null);
    assert.equal(extractBearer(undefined), null);
  });
});

describe("mesh API auth", () => {
  let tokens: AgentTokenStore;
  let auth: ReturnType<typeof createMeshAuth>;
  beforeEach(() => {
    tokens = new AgentTokenStore();
    auth = createMeshAuth(tokens);
  });

  test("health is public", () => {
    assert.equal(run(auth, { method: "GET", path: "/health" }).nextCalled, true);
  });

  test("everything else requires a token", () => {
    for (const [method, path] of [
      ["GET", "/mesh/agents/list"],
      ["POST", "/mesh/agents/register"],
      ["POST", "/mesh/security-wipe"],
      ["POST", "/agents/ai-execute"],
      ["POST", "/agent-mesh/run-python-script"],
      ["POST", "/citadel/accounts/transfer"],
    ]) {
      const r = run(auth, { method, path });
      assert.equal(r.status, 401, `${method} ${path}`);
      assert.equal(r.nextCalled, false);
    }
  });

  test("operator token opens every route; a wrong token does not", () => {
    assert.equal(run(auth, { method: "POST", path: "/mesh/security-wipe", headers: OP }).nextCalled, true);
    assert.equal(
      run(auth, { method: "POST", path: "/mesh/security-wipe", headers: { authorization: "Bearer nope" } }).status,
      401,
    );
  });

  test("agent tokens work only on agent routes, only for that agent", () => {
    const token = tokens.issue("ext-agent-aaa");
    const agentHeaders = { authorization: `Bearer ${token}` };

    const hb = run(auth, { method: "POST", path: "/mesh/agents/heartbeat", headers: agentHeaders, body: {} });
    assert.equal(hb.nextCalled, true);
    assert.equal(hb.req.meshAgentId, "ext-agent-aaa");

    const spoof = run(auth, {
      method: "POST", path: "/mesh/agents/submit-telemetry", headers: agentHeaders, body: { agentId: "ext-agent-bbb" },
    });
    assert.equal(spoof.status, 403);

    assert.equal(run(auth, { method: "GET", path: "/mesh/agents/list", headers: agentHeaders }).status, 401);
    assert.equal(run(auth, { method: "POST", path: "/mesh/security-wipe", headers: agentHeaders }).status, 401);
  });

  test("forged and revoked agent tokens are rejected", () => {
    const token = tokens.issue("ext-agent-aaa");
    const forged = "ext-agent-aaa.not-the-secret";
    assert.equal(tokens.verify(forged), null);
    assert.equal(tokens.verify("ext-agent-zzz.whatever"), null);
    assert.equal(tokens.verify("no-dot"), null);
    assert.equal(tokens.verify(token), "ext-agent-aaa");
    tokens.revoke("ext-agent-aaa");
    assert.equal(tokens.verify(token), null);
  });
});

describe("clientIp", () => {
  const req = { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.9" }, socket: { remoteAddress: "127.0.0.1" } };
  test("ignores X-Forwarded-For unless a proxy is trusted", () => {
    assert.equal(clientIp(req, false), "127.0.0.1");
  });
  test("uses the proxy-added (right-most) hop when trusted", () => {
    assert.equal(clientIp(req, true), "10.0.0.9");
  });
});

describe("WebSocket upgrade", () => {
  test("requires the operator token in ?token=", () => {
    assert.equal(isAuthorizedUpgrade("/ws/mesh"), false);
    assert.equal(isAuthorizedUpgrade("/ws/mesh?token=wrong"), false);
    assert.equal(isAuthorizedUpgrade(`/ws/mesh?token=${getOperatorToken()}`), true);
  });
});
