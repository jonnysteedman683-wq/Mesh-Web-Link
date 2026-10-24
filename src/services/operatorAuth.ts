/**
 * Browser side of mesh API auth.
 *
 * The server prints a link like /?operator_token=... at startup. On first load the
 * token is moved from the URL into localStorage (and removed from the address bar),
 * then attached to every same-origin /api request and to the mesh WebSocket.
 * If the server answers 401 and no token is stored, the operator is asked once.
 */
const STORAGE_KEY = "mesh.operatorToken";
let memoryToken: string | null = null;

export function getOperatorToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || memoryToken;
  } catch {
    return memoryToken; // storage blocked (private mode, etc.)
  }
}

export function setOperatorToken(token: string): void {
  memoryToken = token;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* keep the in-memory copy */
  }
}

/** Adds the operator token to a mesh WebSocket URL (browsers cannot set WS headers). */
export function withOperatorToken(wsUrl: string): string {
  const token = getOperatorToken();
  if (!token) return wsUrl;
  const url = new URL(wsUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function captureTokenFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("operator_token");
    if (!token) return;
    setOperatorToken(token);
    url.searchParams.delete("operator_token");
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    /* ignore malformed URLs */
  }
}

function isSameOriginApi(input: RequestInfo | URL): boolean {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

let installed = false;

export function installOperatorAuth(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  captureTokenFromUrl();

  const originalFetch = window.fetch.bind(window);
  let promptedThisPage = false;

  const authorizedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isSameOriginApi(input)) return originalFetch(input, init);

    const send = () => {
      const token = getOperatorToken();
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      return input instanceof Request
        ? originalFetch(new Request(input, { ...init, headers }))
        : originalFetch(input, { ...init, headers });
    };

    const response = await send();
    if (response.status === 401 && !getOperatorToken() && !promptedThisPage) {
      promptedThisPage = true;
      const entered = window.prompt("Mesh operator token (printed by the server at startup):");
      if (entered && entered.trim()) {
        setOperatorToken(entered.trim());
        return send();
      }
    }
    return response;
  };

  window.fetch = authorizedFetch as typeof window.fetch;
}
