"use client";

import { use } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";

/** `params` is async in this version of Next, so it is unwrapped with `use()`. */
export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  return <ChatPanel conversationId={conversationId} />;
}
