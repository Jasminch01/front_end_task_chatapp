/**
 * The API boundary. Everything the server sends is flattened here, once, so that no
 * component ever has to know about the wire quirks documented in docs/api.md.
 *
 * The quirks being absorbed:
 *   - a message is `_id` + ISO string over REST, `id` + epoch number over the socket
 *   - a direct conversation has `participant` (object), a group has `participants` (array)
 *   - `lastMessage` is `{}` — not null, not absent — when there are no messages
 *   - history comes back newest-first
 *   - the `before` cursor is inclusive, so pages overlap by one message
 */

import type { Conversation, Message, User } from "@/types/chat";

type Raw = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** REST sends an ISO string, the socket sends epoch millis. */
function toDate(value: unknown): Date {
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function normalizeUser(raw: Raw | null | undefined): User {
  const r = raw ?? {};
  return {
    id: str(r._id) || str(r.id),
    name: str(r.name),
    phone: str(r.phone),
  };
}

export function normalizeMessage(raw: Raw | null | undefined): Message {
  const r = raw ?? {};
  return {
    // `id` from the socket, `_id` from REST.
    id: str(r.id) || str(r._id),
    // The request field is `conversationId` but the response field is `conversation`.
    conversationId: str(r.conversation) || str(r.conversationId),
    senderId: str(r.sender),
    text: str(r.text),
    createdAt: toDate(r.createdAt),
    status: "sent",
  };
}

export function normalizeConversation(raw: Raw | null | undefined): Conversation {
  const r = raw ?? {};
  const type = r.type === "group" ? "group" : "direct";

  // A direct conversation carries the other person as `participant` (already resolved
  // for us, which is genuinely convenient); a group carries the full `participants`.
  const participants: User[] =
    type === "group"
      ? Array.isArray(r.participants)
        ? (r.participants as Raw[]).map(normalizeUser)
        : []
      : r.participant
        ? [normalizeUser(r.participant as Raw)]
        : [];

  const lm = r.lastMessage as Raw | undefined;
  // `{}` means "no messages yet". `if (lastMessage)` would be true and `.text` undefined.
  const hasLast = !!lm && typeof lm === "object" && Object.keys(lm).length > 0;

  return {
    id: str(r._id) || str(r.id),
    type,
    title:
      type === "group"
        ? str(r.name) || "Group"
        : participants[0]?.name || "Unknown",
    participants,
    adminIds: Array.isArray(r.admins) ? (r.admins as unknown[]).map(String) : [],
    createdBy: r.createdBy ? String(r.createdBy) : null,
    lastMessage: hasLast
      ? {
          text: str(lm!.text),
          senderId: str(lm!.sender),
          createdAt: toDate(lm!.createdAt),
        }
      : null,
    updatedAt: toDate(r.updatedAt),
  };
}

/**
 * Merge messages from any source into one ordered list, oldest first.
 *
 * Handles three overlaps at once:
 *   - the inclusive `before` cursor, which repeats one message per page
 *   - a server message replacing its optimistic twin (matched on tempId)
 *   - the same message arriving from REST and from the socket after a reconnect
 *
 * Sorted by createdAt with the id as tie-break so the order is deterministic when two
 * messages share a timestamp.
 */
export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();

  for (const m of existing) byId.set(m.id, m);

  for (const m of incoming) {
    // A confirmed message replaces the optimistic entry it came from, rather than
    // appending next to it.
    if (m.tempId && byId.has(m.tempId)) byId.delete(m.tempId);
    byId.set(m.id, m);
  }

  return [...byId.values()].sort((a, b) => {
    const t = a.createdAt.getTime() - b.createdAt.getTime();
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
}

/** History arrives newest-first; the UI reads oldest at the top. */
export function normalizeHistory(raw: Raw): { messages: Message[]; hasMore: boolean } {
  const list = Array.isArray(raw.messages) ? (raw.messages as Raw[]) : [];
  return {
    messages: list.map(normalizeMessage).reverse(),
    hasMore: raw.hasMore === true,
  };
}
