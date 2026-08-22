/**
 * Every cache read and write goes through these, so an invalidation can never miss a
 * key because it was spelled differently somewhere else.
 */

export const queryKeys = {
  conversations: () => ["conversations"] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  userSearch: (q: string) => ["users", "search", q] as const,
};
