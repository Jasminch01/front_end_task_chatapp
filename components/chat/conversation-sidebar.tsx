"use client";

/**
 * The conversation list. Rendered from the chat layout so it survives conversation
 * switches without unmounting or refetching.
 *
 * On narrow screens this IS the /chat screen; opening a conversation pushes over it.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LogOut, MessageCirclePlus, RefreshCw, Users, UsersRound } from "lucide-react";
import { useConversations } from "@/hooks/use-chat";
import { useAuth } from "@/lib/auth";
import { messageTime, dayLabel } from "@/lib/format";
import { Avatar } from "./avatar";
import { NewChatDialog } from "@/components/conversations/new-chat-dialog";
import { NewGroupDialog } from "@/components/conversations/new-group-dialog";
import { isToday } from "date-fns";

export function ConversationSidebar() {
  const { data, isLoading, isError, refetch } = useConversations();
  const { user, logout } = useAuth();
  const params = useParams<{ conversationId?: string }>();
  const activeId = params?.conversationId;
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  return (
    <aside
      className={[
        "flex w-full flex-col border-r border-border bg-surface md:w-80 lg:w-96",
        // On mobile the sidebar is hidden once a conversation is open.
        activeId ? "hidden md:flex" : "flex",
      ].join(" ")}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-semibold">Pulse</p>
          {user && (
            <p className="truncate text-xs text-foreground-muted">
              {user.name} · <span className="font-mono">{user.phone}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowNewGroup(true)}
          aria-label="New group"
          className="rounded-lg p-2 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <UsersRound className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowNewChat(true)}
          aria-label="New conversation"
          className="rounded-lg p-2 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <MessageCirclePlus className="size-5" />
        </button>
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          className="rounded-lg p-2 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      <div className="thin-scrollbar flex-1 overflow-y-auto">
        {isLoading && (
          <ul className="flex flex-col gap-1 p-3">
            {[68, 52, 60, 44].map((width, i) => (
              <li key={i} className="flex items-center gap-3 px-1 py-2.5">
                <span className="size-10 animate-pulse rounded-full bg-surface-muted" />
                <span className="flex-1">
                  <span
                    className="mb-1.5 block h-3 animate-pulse rounded bg-surface-muted"
                    style={{ width: `${width}%` }}
                  />
                  <span className="block h-2.5 w-1/3 animate-pulse rounded bg-surface-muted" />
                </span>
              </li>
            ))}
          </ul>
        )}

        {isError && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-foreground-muted">Couldn&apos;t load conversations.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-surface-muted"
            >
              <RefreshCw className="size-3.5" />
              Try again
            </button>
          </div>
        )}

        {data && data.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="font-display text-base font-semibold">No conversations yet</p>
            <p className="mt-1 text-sm text-foreground-muted">
              Find someone by name and say hello.
            </p>
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
            >
              <MessageCirclePlus className="size-4" />
              Start a conversation
            </button>
            <button
              type="button"
              onClick={() => setShowNewGroup(true)}
              className="mt-2 block w-full text-sm text-foreground-muted underline underline-offset-2 transition hover:text-foreground"
            >
              or create a group
            </button>
          </div>
        )}

        <ul>
          {data?.map((conversation) => {
            const active = conversation.id === activeId;
            const last = conversation.lastMessage;

            return (
              <li key={conversation.id}>
                <Link
                  href={`/chat/${conversation.id}`}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 border-l-2 px-4 py-3 transition",
                    active
                      ? "border-accent bg-surface-muted"
                      : "border-transparent hover:bg-surface-muted/60",
                  ].join(" ")}
                >
                  {conversation.type === "group" ? (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
                      <Users className="size-4" />
                    </span>
                  ) : (
                    <Avatar
                      name={conversation.title}
                      id={conversation.participants[0]?.id ?? conversation.id}
                    />
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{conversation.title}</span>
                      {last && (
                        <time
                          dateTime={last.createdAt.toISOString()}
                          className="shrink-0 text-[11px] text-foreground-muted"
                        >
                          {isToday(last.createdAt)
                            ? messageTime(last.createdAt)
                            : dayLabel(last.createdAt)}
                        </time>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-foreground-muted">
                      {/* `lastMessage` is `{}` on an empty conversation, normalised to null. */}
                      {last ? last.text || "…" : "No messages yet"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {showNewChat && <NewChatDialog onClose={() => setShowNewChat(false)} />}
      {showNewGroup && <NewGroupDialog onClose={() => setShowNewGroup(false)} />}
    </aside>
  );
}
