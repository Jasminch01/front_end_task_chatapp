/**
 * Unread tracking, done client-side.
 *
 * `GET /conversations` returns no unread count — see docs/api.md — so the only honest
 * way to show one is to remember when the user last opened each conversation and compare
 * that against the conversation's `lastMessage.createdAt`.
 *
 * The limits of that, stated plainly:
 *   - it is per-device, because it lives in this browser's localStorage
 *   - a conversation read on your phone still looks unread here
 *   - it counts "has something arrived since you looked", not "how many messages"
 *
 * A server-side unread count would fix all three, and that is in the write-up as the
 * first thing I'd want added to the API.
 */

const STORAGE_KEY = "pulse.lastRead";

type ReadMap = Record<string, number>;

let cache: ReadMap | null = null;
const listeners = new Set<() => void>();

function load(): ReadMap {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    // Private mode or blocked storage — degrade to memory rather than throwing.
    cache = {};
  }
  return cache;
}

function persist(map: ReadMap) {
  cache = map;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal: unread state simply won't survive a refresh.
  }
  listeners.forEach((fn) => fn());
}

export function markRead(conversationId: string, at: number = Date.now()) {
  const map = load();
  if (map[conversationId] >= at) return;
  persist({ ...map, [conversationId]: at });
}

export const unreadStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): ReadMap {
    return load();
  },
  /** The server never renders this, and it must not differ between server and client. */
  getServerSnapshot(): ReadMap {
    return EMPTY;
  },
};

const EMPTY: ReadMap = {};

/**
 * A conversation is unread when its last message arrived after the user last opened it,
 * and it wasn't the user who sent it.
 */
export function isUnread(
  readMap: ReadMap,
  conversationId: string,
  lastMessageAt: Date | null,
  lastMessageSenderId: string | undefined,
  currentUserId: string | undefined,
): boolean {
  if (!lastMessageAt) return false;
  if (lastMessageSenderId && lastMessageSenderId === currentUserId) return false;
  return lastMessageAt.getTime() > (readMap[conversationId] ?? 0);
}

/**
 * "Active recently" — the closest thing to presence this API supports, derived from the
 * last message time. There are no presence events on the socket, so a live online
 * indicator would be invented rather than observed.
 */
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function isRecentlyActive(lastMessageAt: Date | null): boolean {
  if (!lastMessageAt) return false;
  return Date.now() - lastMessageAt.getTime() < ACTIVE_WINDOW_MS;
}
