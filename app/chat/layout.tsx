"use client";

/**
 * The chat shell.
 *
 * The sidebar lives here rather than in each page so it is not unmounted and refetched
 * every time the user switches conversation — a layout persists across its sibling
 * segments.
 *
 * The socket subscription lives here too, for the same reason: one connection for the
 * whole session, feeding both the sidebar and the open conversation.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useChatSocket } from "@/hooks/use-chat";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { ConnectionBanner } from "@/components/chat/connection-banner";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const connection = useChatSocket();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  // "loading" and "anonymous" are different states. Rendering the shell during the
  // token check would flash the login screen on every refresh.
  if (status !== "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-foreground-muted" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConnectionBanner status={connection} />
      <div className="flex min-h-0 flex-1">
        <ConversationSidebar />
        {children}
      </div>
    </div>
  );
}
