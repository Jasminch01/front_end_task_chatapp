/**
 * One function per API route the app uses. Everything returns domain types, never
 * wire shapes — normalization happens here so hooks and components stay clean.
 */

import type { Conversation, Message, Session, User } from "@/types/chat";
import { request } from "./client";
import {
  normalizeConversation,
  normalizeHistory,
  normalizeMessage,
  normalizeUser,
} from "@/lib/normalize";

type Raw = Record<string, unknown>;

export const auth = {
  /** Login and registration are the same call: a new phone becomes a new account. */
  async login(phone: string, name: string): Promise<Session> {
    const raw = await request<Raw>("/auth/login", {
      method: "POST",
      body: { phone, name },
    });
    return {
      token: String(raw.token ?? ""),
      user: normalizeUser(raw.user as Raw),
    };
  },

  /** The user is returned flat here, but wrapped in `user` by login. */
  async me(): Promise<User> {
    return normalizeUser(await request<Raw>("/auth/me"));
  },
};

export const users = {
  /**
   * Search by name or phone.
   *
   * `q` goes into a regex on the server without escaping, so a `+` returns a 500 —
   * which is exactly how phone numbers are stored. Rather than let that reach the
   * user, a query containing regex metacharacters is refused locally and reported as
   * an empty result. See docs/api.md.
   */
  async search(q: string): Promise<User[]> {
    const term = q.trim();
    if (!term) return [];
    if (/[+*?()[\]{}\\^$|]/.test(term)) return [];

    const raw = await request<Raw[]>(`/users/search?q=${encodeURIComponent(term)}`);
    return Array.isArray(raw) ? raw.map(normalizeUser) : [];
  },
};

export const conversations = {
  /** Wrapped in `{ data }` — unlike search (bare array) and history (`{ messages }`). */
  async list(): Promise<Conversation[]> {
    const raw = await request<{ data?: Raw[] }>("/conversations");
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list
      .map(normalizeConversation)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  /**
   * Start a 1-to-1 conversation. Idempotent server-side — calling it twice for the
   * same pair returns the same conversation, so no client-side guard is needed.
   *
   * The response shape does not match the list shape (no `type`, participants are
   * bare ids), so only the id is used and the list is refetched.
   */
  async startDirect(userId: string): Promise<string> {
    const raw = await request<Raw>("/conversations", {
      method: "POST",
      body: { userId },
    });
    return String(raw._id ?? "");
  },

  /**
   * Create a group. `participantIds` are the members BESIDES the caller — the creator
   * is added automatically and becomes the first admin.
   *
   * Unlike the direct-conversation create, this one validates properly and returns 201
   * with the full populated conversation.
   */
  async createGroup(name: string, participantIds: string[]): Promise<string> {
    const raw = await request<Raw>("/conversations/group", {
      method: "POST",
      body: { name, participantIds },
    });
    return String(raw._id ?? "");
  },

  /** Rename a group. Admin only — a non-admin gets 403 FORBIDDEN. */
  async rename(conversationId: string, name: string): Promise<void> {
    await request(`/conversations/${conversationId}`, { method: "PATCH", body: { name } });
  },

  /** Add members. Admin only. Adding an existing member is a no-op server-side. */
  async addParticipants(conversationId: string, userIds: string[]): Promise<void> {
    await request(`/conversations/${conversationId}/participants`, {
      method: "POST",
      body: { userIds },
    });
  },

  /** Remove a member — or pass your own id, which is how leaving works. */
  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await request(`/conversations/${conversationId}/participants/${userId}`, {
      method: "DELETE",
      allowNull: true,
    });
  },

  /**
   * Promote a member to admin. One-way: the API has no demote route, so the UI must
   * not offer one.
   */
  async promoteAdmin(conversationId: string, userId: string): Promise<void> {
    await request(`/conversations/${conversationId}/admins`, {
      method: "POST",
      body: { userId },
    });
  },

  /** `before` is inclusive, so the caller drops the duplicate — see useMessages. */
  async history(
    conversationId: string,
    options: { limit?: number; before?: string } = {},
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const params = new URLSearchParams({ limit: String(options.limit ?? 25) });
    if (options.before) params.set("before", options.before);

    return normalizeHistory(
      await request<Raw>(`/conversations/${conversationId}/messages?${params}`),
    );
  },
};

export const messages = {
  /**
   * Sent over REST rather than the socket: the socket's `message:send` acks only
   * `{ ok: true }` and there is no sender echo, so a socket send returns nothing
   * that identifies the message. REST returns the created message.
   */
  async send(conversationId: string, text: string): Promise<Message> {
    const raw = await request<Raw>("/messages", {
      method: "POST",
      body: { conversationId, text },
    });
    return normalizeMessage(raw);
  },
};
