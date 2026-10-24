/**
 * Mesh API authentication.
 *
 * Two kinds of caller:
 *  - Operator: the browser console or an admin script. Holds MESH_OPERATOR_TOKEN
 *    (or the token generated and printed at startup). May call every route.
 *  - Agent: an external worker registered by an operator. Holds its own token
 *    "<agentId>.<secret>" and may only call its self-service routes, for itself.
 *
 * Only GET /api/health is public. Tokens are compared in constant time, and
 * agent secrets are stored as SHA-256 hashes, never returned after registration.
 */
import crypto from "crypto";

let generatedOperatorToken: string | null = null;

export function getOperatorToken(): string {
  const configured = (process.env.MESH_OPERATOR_TOKEN || "").trim();
  if (configured) return configured;
  if (!generatedOperatorToken) generatedOperatorToken = crypto.randomBytes(32).toString("base64url");
  return generatedOperatorToken;
}

export function operatorTokenWasGenerated(): boolean {
  return !(process.env.MESH_OPERATOR_TOKEN || "").trim();
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function extractBearer(header: unknown): string | null {
  if (typeof header !== "string") return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

export function isOperatorToken(token: string | null | undefined): boolean {
  return typeof token === "string" && token.length > 0 && safeEqual(token, getOperatorToken());
}

/** Agent token registry: agentId -> sha256(secret). */
export class AgentTokenStore {
  private hashes = new Map<string, string>();

  issue(agentId: string): string {
    const secret = crypto.randomBytes(32).toString("base64url");
    this.hashes.set(agentId, sha256(secret));
    return `${agentId}.${secret}`;
  }

  /** Returns the agent ID a token belongs to, or null if it is not a valid agent token. */
  verify(token: string | null | undefined): string | null {
    if (typeof token !== "string") return null;
    const dot = token.lastIndexOf(".");
    if (dot <= 0 || dot === token.length - 1) return null;
    const agentId = token.slice(0, dot);
    const expected = this.hashes.get(agentId);
    if (!expected) return null;
    return safeEqual(sha256(token.slice(dot + 1)), expected) ? agentId : null;
  }

  revoke(agentId: string): void {
    this.hashes.delete(agentId);
  }

  clear(): void {
    this.hashes.clear();
  }
}

/** Routes an agent token may call (method + path relative to /api). */
const AGENT_ROUTES = new Set([
  "POST /mesh/agents/heartbeat",
  "POST /mesh/agents/submit-telemetry",
  "GET /mesh/agents/directives",
]);

const PUBLIC_ROUTES = new Set(["GET /health"]);

/**
 * Express middleware for routes mounted under /api.
 * Sets req.meshRole ("operator" | "agent") and req.meshAgentId for agents.
 */
export function createMeshAuth(agentTokens: AgentTokenStore) {
  return (req: any, res: any, next: () => void) => {
    const route = `${req.method} ${req.path}`;
    if (PUBLIC_ROUTES.has(route)) return next();

    const token = extractBearer(req.headers?.authorization);
    if (isOperatorToken(token)) {
      req.meshRole = "operator";
      return next();
    }

    if (AGENT_ROUTES.has(route)) {
      const agentId = agentTokens.verify(token);
      if (agentId) {
        const claimed = req.body?.agentId ?? req.query?.agentId;
        if (claimed !== undefined && claimed !== agentId) {
          return res.status(403).json({ error: "Agent tokens may only act for their own agentId" });
        }
        req.meshRole = "agent";
        req.meshAgentId = agentId;
        return next();
      }
    }

    return res.status(401).json({
      error: "Unauthorized",
      message: "Send 'Authorization: Bearer <MESH_OPERATOR_TOKEN>' (or an agent token for agent routes).",
    });
  };
}

/**
 * Client IP for rate limiting. X-Forwarded-For is attacker-controlled unless a
 * trusted proxy sits in front, so it is ignored unless TRUST_PROXY=1; then the
 * right-most entry (added by the proxy itself) is used.
 */
export function clientIp(req: any, trustProxy = process.env.TRUST_PROXY === "1"): string {
  if (trustProxy) {
    const forwarded = req.headers?.["x-forwarded-for"];
    const value = Array.isArray(forwarded) ? forwarded.join(",") : forwarded;
    if (typeof value === "string" && value.trim()) {
      const hops = value.split(",").map((h: string) => h.trim()).filter(Boolean);
      if (hops.length) return hops[hops.length - 1];
    }
  }
  return req.socket?.remoteAddress || "unknown";
}

/** WebSocket upgrade check: the operator token travels as ?token= (browsers cannot set headers). */
export function isAuthorizedUpgrade(url: string | undefined): boolean {
  try {
    const parsed = new URL(url || "", "http://localhost");
    return isOperatorToken(parsed.searchParams.get("token"));
  } catch {
    return false;
  }
}
