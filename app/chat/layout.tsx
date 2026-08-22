"use client";

/**
 * The chat shell.
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <ConnectionBanner status={connection} />
      <div className="flex min-h-0 flex-1">
        <ConversationSidebar />
        {children}
      </div>
    </div>
  );
}
