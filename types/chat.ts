/**
 * Domain types — what the UI thinks in.
 *
 * These are NOT the wire shapes. The API returns `_id` over REST and `id` over the
 * socket, `createdAt` as an ISO string over REST and an epoch number over the socket,
 * and a direct conversation carries `participant` while a group carries `participants`.
 * All of that is flattened once in lib/normalize.ts so nothing below the API boundary
 * has to branch on it. See docs/api.md.
 */

export type User = {
  id: string;
  name: string;
  phone: string;
};

export type MessageStatus = "sent" | "pending" | "failed";

export type Message = {
  /** Server id, or the client tempId while the message is still pending. */
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  status: MessageStatus;
  /** Set only on optimistic messages, so a failed send can be retried or dropped. */
  tempId?: string;
};

export type ConversationType = "direct" | "group";

export type Conversation = {
  id: string;
  type: ConversationType;
  /** Resolved once: the other person's name for a direct chat, the group name for a group. */
  title: string;
  participants: User[];
  /** Group only. Admins may rename, add and remove; there is no demote route. */
  adminIds: string[];
  createdBy: string | null;
  /** null when the conversation has no messages — the API sends `{}`, not null. */
  lastMessage: { text: string; senderId: string; createdAt: Date } | null;
  updatedAt: Date;
};

export type Session = {
  token: string;
  user: User;
};
