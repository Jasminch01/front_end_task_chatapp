/**
 * Error normalization.
 *
 * The API envelope is `{ error: { message, code, details? } }`, but the status codes
 * do not line up with it: a missing token is 400 NO_TOKEN while an invalid token is
 * 401 INVALID_TOKEN. So auth failures are detected by `code`, never by status —
 * a 401-only interceptor would never fire for a missing token. See docs/api.md.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | number;
  readonly details?: { path: string; message: string }[];

  constructor(
    status: number,
    code: string | number,
    message: string,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Both auth failure codes, because the statuses disagree. */
export function isAuthError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "NO_TOKEN" || error.code === "INVALID_TOKEN")
  );
}

/** A message a human should actually see. Never leak a raw server string unguarded. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Field-level validation reads better than the generic "Validation failed".
    if (error.details?.length) return error.details[0].message;

    // 500s from this API leak mongoose internals ("Cast to ObjectId failed ... for
    // model \"Message\""). Never show that to a user.
    if (error.status >= 500) return "Something went wrong. Please try again.";

    return error.message || "Request failed.";
  }
  if (error instanceof TypeError) return "Can't reach the server. Check your connection.";
  return "Something went wrong. Please try again.";
}
