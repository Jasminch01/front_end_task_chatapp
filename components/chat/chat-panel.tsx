"use client";

/**
 * The chat panel: header, message list, composer.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Settings2, UserPlus, Users } from "lucide-react";
import { useConversation, useMessages } from "@/hooks/use-chat";
import { useAuth } from "@/lib/auth";
import { toUserMessage } from "@/lib/api/errors";
import { markRead } from "@/lib/unread";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";
import { Avatar } from "./avatar";
import { GroupSettingsSheet } from "@/components/conversations/group-settings-sheet";

export function ChatPanel({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const conversation = useConversation(conversationId);
  const captureAnchorRef = useRef<(() => void) | null>(null);
  const [settingsIntent, setSettingsIntent] = useState<"details" | "add" | null>(null);

  const {
    messages,
    hasMore,
    isLoading,
    isError,
    error,
    refetch,
    isLoadingOlder,
    loadOlder,
    send,
    retry,
    discard,
  } = useMessages(conversationId);

  const newestAt = messages[messages.length - 1]?.createdAt?.getTime();
  useEffect(() => {
    markRead(conversationId, newestAt ? Math.max(newestAt, Date.now()) : Date.now());
  }, [conversationId, newestAt]);

  if (!user) return null;

  const isGroup = conversation?.type === "group";
  const isGroupAdmin = isGroup && !!conversation && conversation.adminIds.includes(user.id);
  const subtitle = isGroup
    ? `${conversation?.participants.length ?? 0} members`
    : conversation?.participants[0]?.phone;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        {/* Mobile: the panel is a pushed view over the list. */}
        <Link
          href="/chat"
          aria-label="Back to conversations"
          className="-ml-1 rounded-lg p-1.5 text-foreground-muted transition hover:bg-surface-muted md:hidden"
        >
          <ArrowLeft className="size-5" />
        </Link>

        {isGroup ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
            <Users className="size-4" />
          </span>
        ) : (
          <Avatar
            name={conversation?.title ?? "…"}
            id={conversation?.participants[0]?.id ?? conversationId}
            size={36}
          />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] leading-tight font-semibold">
            {conversation?.title ?? "Conversation"}
          </h1>
          {subtitle && (
            <p className="truncate font-mono text-xs text-foreground-muted">{subtitle}</p>
          )}
        </div>

        {isGroupAdmin && (
          <button
            type="button"
            onClick={() => setSettingsIntent("add")}
            aria-label="Add people"
            title="Add people"
            className="rounded-lg p-2 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <UserPlus className="size-4" />
          </button>
        )}

        {isGroup && conversation && (
          <button
            type="button"
            onClick={() => setSettingsIntent("details")}
            aria-label="Group details"
            className="rounded-lg p-2 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <Settings2 className="size-4" />
          </button>
        )}
      </header>

      {isLoading && (
        <div className="flex flex-1 flex-col justify-end gap-3 px-4 py-6 sm:px-6">
          {/* Skeletons alternate sides and vary in width — a column of identical grey
              rectangles reads as broken rather than as loading. */}
          {[
            { own: false, w: "58%" },
            { own: true, w: "42%" },
            { own: false, w: "66%" },
            { own: true, w: "35%" },
          ].map((row, i) => (
            <div key={i} className={`flex ${row.own ? "justify-end" : "justify-start"}`}>
              <span
                className="h-9 animate-pulse rounded-2xl bg-surface-muted"
                style={{ width: row.w }}
              />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-foreground-muted">{toUserMessage(error)}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-surface-muted"
          >
            <RefreshCw className="size-3.5" />
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && messages.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="font-display text-lg font-semibold">Say hello</p>
          <p className="mt-1 max-w-xs text-sm text-foreground-muted">
            This is the start of your conversation with {conversation?.title ?? "them"}.
          </p>
        </div>
      )}

      {!isLoading && !isError && messages.length > 0 && (
        <MessageList
          // Remounting per conversation resets scroll state and the unseen counter
          // without a reset effect — switching threads starts pinned at its own bottom.
          key={conversationId}
          conversation={conversation}
          messages={messages}
          currentUserId={user.id}
          hasMore={hasMore}
          isLoadingOlder={isLoadingOlder}
          onLoadOlder={loadOlder}
          onRetry={retry}
          onDiscard={discard}
          captureAnchorRef={captureAnchorRef}
        />
      )}

      <MessageComposer
        conversationId={conversationId}
        disabled={isLoading || isError}
        onSend={send}
      />

      {settingsIntent && conversation && (
        <GroupSettingsSheet
          conversation={conversation}
          initialFocus={settingsIntent === "add" ? "add" : undefined}
          onClose={() => setSettingsIntent(null)}
        />
      )}
    </section>
  );
}
