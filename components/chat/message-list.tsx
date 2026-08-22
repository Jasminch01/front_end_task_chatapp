"use client";

/**
 * The scroll container: day dividers, sender groups, older-page loading, and the
 * auto-scroll contract from useStickToBottom.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, LoaderCircle } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { dayLabel, startsNewDay, startsNewGroup } from "@/lib/format";
import { useStickToBottom } from "@/hooks/use-stick-to-bottom";
import type { Conversation, Message } from "@/types/chat";

type Props = {
  conversation: Conversation | undefined;
  messages: Message[];
  currentUserId: string;
  hasMore: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => Promise<boolean>;
  onRetry: (message: Message) => void;
  onDiscard: (message: Message) => void;
  captureAnchorRef: React.MutableRefObject<(() => void) | null>;
};

export function MessageList({
  conversation,
  messages,
  currentUserId,
  hasMore,
  isLoadingOlder,
  onLoadOlder,
  onRetry,
  onDiscard,
  captureAnchorRef,
}: Props) {
  const {
    containerRef,
    isPinned,
    pinnedRef,
    scrollToBottom,
    captureAnchor,
    clearAnchor,
    restoreAnchor,
    jumpOnFirstContent,
  } = useStickToBottom();

  const topSentinel = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);
  const lastIdRef = useRef<string | null>(null);

  // State, not a ref: the pill has to re-render as the count climbs.
  const [unseen, setUnseen] = useState(0);

  // Expose the anchor capture so the panel can call it before prepending.
  useEffect(() => {
    captureAnchorRef.current = captureAnchor;
  }, [captureAnchor, captureAnchorRef]);

  useEffect(() => {
    jumpOnFirstContent(messages.length > 0);
  }, [messages.length, jumpOnFirstContent]);

  // The rule: follow the latest only when the user is already at the bottom.
  useEffect(() => {
    if (messages.length === 0) return;

    const grew = messages.length > lastCountRef.current;
    const newestId = messages[messages.length - 1]?.id ?? null;
    const isAppend = grew && newestId !== lastIdRef.current;

    lastCountRef.current = messages.length;
    lastIdRef.current = newestId;

    if (!isAppend) return;

    if (pinnedRef.current) {
      scrollToBottom("smooth");
      setUnseen(0);
    } else {
      // Scrolled up and reading — do not move them. The pill offers the way back.
      setUnseen((n) => n + 1);
    }
  }, [messages, pinnedRef, scrollToBottom]);

  /*
   * Anchor restore runs only on a genuine prepend. Detecting it by the first message id
   */
  const firstId = messages[0]?.id ?? null;
  const prevFirstIdRef = useRef(firstId);
  useLayoutEffect(() => {
    if (prevFirstIdRef.current === firstId) return;
    prevFirstIdRef.current = firstId;
    restoreAnchor();
  }, [firstId, restoreAnchor]);

  // Load older pages when the top comes into view.
  useEffect(() => {
    const sentinel = topSentinel.current;
    const root = containerRef.current;
    if (!sentinel || !root || !hasMore) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || isLoadingOlder) return;
        captureAnchor();
        const loaded = await onLoadOlder();
        // Nothing was prepended — drop the anchor so it can't fire later.
        if (!loaded) clearAnchor();
      },
      { root, rootMargin: "120px 0px 0px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingOlder, onLoadOlder, captureAnchor, clearAnchor, containerRef]);

  const isGroup = conversation?.type === "group";
  const nameById = new Map(conversation?.participants.map((p) => [p.id, p.name]) ?? []);

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        ref={containerRef}
        className="thin-scrollbar flex-1 overflow-y-auto overscroll-contain"
      >
        {/* `justify-end` keeps a short conversation resting on the composer rather
            than floating at the top of an empty column. */}
        <div className="flex min-h-full flex-col justify-end px-4 py-4 sm:px-6">
          <div ref={topSentinel} aria-hidden />

          {hasMore && (
            <div className="flex justify-center py-2 text-xs text-foreground-muted">
              {isLoadingOlder ? (
                <span className="flex items-center gap-1.5">
                  <LoaderCircle className="size-3 animate-spin" />
                  Loading earlier messages
                </span>
              ) : (
                <span>Scroll up for earlier messages</span>
              )}
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <p className="py-2 text-center text-xs text-foreground-muted">
              This is the beginning of your conversation
            </p>
          )}

          {/* Announced politely so arriving messages don't steal focus from the composer. */}
          <ul aria-live="polite" aria-relevant="additions" className="flex flex-col gap-0.5">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const isOwn = message.senderId === currentUserId;

              const newDay = startsNewDay(message.createdAt, previous?.createdAt);
              const newGroup = startsNewGroup(
                message.senderId,
                message.createdAt,
                previous?.senderId,
                previous?.createdAt,
              );
              const lastOfGroup =
                !next ||
                startsNewGroup(next.senderId, next.createdAt, message.senderId, message.createdAt);

              return (
                <div key={message.id} className="contents">
                  {newDay && (
                    <li className="my-3 flex items-center gap-3 px-1" role="separator">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[11px] font-medium tracking-wide text-foreground-muted uppercase">
                        {dayLabel(message.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </li>
                  )}
                  <div className={newGroup && !newDay ? "mt-2.5 contents" : "contents"}>
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      // A name only helps in a group; in a 1-to-1 it's noise.
                      senderName={
                        isGroup && !isOwn && newGroup
                          ? (nameById.get(message.senderId) ?? "Someone")
                          : undefined
                      }
                      showTime={lastOfGroup}
                      onRetry={onRetry}
                      onDiscard={onDiscard}
                    />
                  </div>
                </div>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Shown only when the user has scrolled away from the bottom. */}
      {!isPinned && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium shadow-lg transition hover:bg-surface-muted"
        >
          <ArrowDown className="size-3.5" />
          {unseen > 0 ? `${unseen} new message${unseen > 1 ? "s" : ""}` : "Jump to latest"}
        </button>
      )}
    </div>
  );
}
