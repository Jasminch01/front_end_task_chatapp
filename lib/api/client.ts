/**
 * The only module that speaks HTTP to the chat API.
 *
 * Guards two things the API does that would otherwise crash a component:
 *   - a body that is not JSON at all (an HTML error page from the host)
 *   - a literal `null` body with status 200, which POST /messages returns when the
 *     conversation is not yours (see docs/api.md)
 */

import { ApiError } from "./errors";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://frontend-task-chatapp.onrender.com/api";

let currentToken: string | null = null;

export function setApiToken(token: string | null) {
  currentToken = token;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Some responses are legitimately empty; most are not. */
  allowNull?: boolean;
};

export async function request<T = unknown>(
  path: string,
  { method = "GET", body, allowNull = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();

  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON — a proxy error page, or the host waking up.
      throw new ApiError(response.status, "NON_JSON", "Unexpected response from server.");
    }
  }

  if (!response.ok) {
    const envelope = (parsed as { error?: { message?: string; code?: string | number; details?: { path: string; message: string }[] } } | null)?.error;
    throw new ApiError(
      response.status,
      envelope?.code ?? "UNKNOWN",
      envelope?.message ?? `Request failed with ${response.status}.`,
      envelope?.details,
    );
  }

  // A 200 with a null body means the server silently refused. Treat it as the error
  // it should have been, so callers never dereference null.
  if (parsed === null && !allowNull) {
    throw new ApiError(response.status, "NULL_BODY", "That conversation isn't available.");
  }

  return parsed as T;
}
