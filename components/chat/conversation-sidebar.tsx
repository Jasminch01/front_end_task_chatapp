"use client";

/**
 * The conversation list. Rendered from the chat layout so it survives conversation
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { LogOut, MessageCirclePlus, RefreshCw, Search, Users, UsersRound } from "lucide-react";
import { isToday } from "date-fns";
import { useConversations } from "@/hooks/use-chat";
import { useAuth } from "@/lib/auth";
import { messageTime, dayLabel } from "@/lib/format";
import { isRecentlyActive, isUnread, unreadStore } from "@/lib/unread";
import { Avatar } from "./avatar";
import { Logo } from "@/components/brand/logo";
import { NewChatDialog } from "@/components/conversations/new-chat-dialog";
import { NewGroupDialog } from "@/components/conversations/new-group-dialog";

type Filter = "all" | "unread" | "groups";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
];

export function ConversationSidebar() {
  const { data, isLoading, isError, refetch } = useConversations();
  const { user, logout } = useAuth();
  const params = useParams<{ conversationId?: string }>();
  const activeId = params?.conversationId;

  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [term, setTerm] = useState("");

  const readMap = useSyncExternalStore(
    unreadStore.subscribe,
    unreadStore.getSnapshot,
    unreadStore.getServerSnapshot,
  );

  const unreadCount = useMemo(
    () =>
      (data ?? []).filter((c) =>
        isUnread(readMap, c.id, c.lastMessage?.createdAt ?? null, c.lastMessage?.senderId, user?.id),
      ).length,
    [data, readMap, user?.id],
  );

  // Filtering runs over the already-loaded list — the API has no conversation search,
  // and doing it locally is instant rather than a round trip.
  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (filter === "groups" && c.type !== "group") return false;
      if (
        filter === "unread" &&
        !isUnread(readMap, c.id, c.lastMessage?.createdAt ?? null, c.lastMessage?.senderId, user?.id)
      )
        return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.participants.some((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
      );
    });
  }, [data, filter, term, readMap, user?.id]);

  const emptyBecauseFiltered = (data?.length ?? 0) > 0 && visible.length === 0;

  return (
    <aside
      className={[
        "flex min-h-0 w-full flex-col border-r border-border bg-surface md:w-80 lg:w-96",
        // On mobile the sidebar is hidden once a conversation is open.
        activeId ? "hidden md:flex" : "flex",
      ].join(" ")}
    >
      {/* ------------------------------------------------------------- header */}
      <header className="flex items-center gap-1 border-b border-border px-4 py-3">
        <span className="flex flex-1 items-center gap-2">
          <Logo size={26} />
          <span className="font-display text-xl leading-tight font-bold tracking-tight">yap</span>
        </span>
        <button
          type="button"
          onClick={() => setShowNewChat(true)}
          aria-label="New conversation"
          title="New conversation"
          className="rounded-lg p-2 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <MessageCirclePlus className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowNewGroup(true)}
          aria-label="New group"
          title="New group"
          className="rounded-lg p-2 text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <UsersRound className="size-5" />
        </button>
      </header>

      {/* ------------------------------------------------------ search + filter */}
      <div className="flex flex-col gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <Search className="size-4 shrink-0 text-foreground-muted" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Filter conversations…"
            aria-label="Filter conversations"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-muted/60"
          />
        </div>

        <div role="tablist" aria-label="Filter conversations" className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition",
                filter === f.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground-muted hover:bg-surface-muted",
              ].join(" ")}
            >
              {f.id === "groups" && <Users className="size-3" />}
              {f.label}
              {f.id === "unread" && unreadCount > 0 && (
                <span
                  className={[
                    "rounded-full px-1.5 text-[10px] leading-4 font-semibold",
                    filter === "unread"
                      ? "bg-accent-foreground/25"
                      : "bg-accent text-accent-foreground",
                  ].join(" ")}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------------------- list */}
      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
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

        {/* Filtered-to-nothing is a different state from having nothing. */}
        {emptyBecauseFiltered && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-foreground-muted">
              {filter === "unread"
                ? "Nothing unread."
                : filter === "groups"
                  ? "No group conversations yet."
                  : `No conversation matches “${term.trim()}”.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setTerm("");
              }}
              className="mt-2 text-sm text-accent underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        )}

        <ul>
          {visible.map((conversation) => {
            const active = conversation.id === activeId;
            const last = conversation.lastMessage;
            const unread = isUnread(
              readMap,
              conversation.id,
              last?.createdAt ?? null,
              last?.senderId,
              user?.id,
            );
            const recentlyActive =
              conversation.type === "direct" && isRecentlyActive(last?.createdAt ?? null);

            return (
              <li key={conversation.id}>
                <Link
                  href={`/chat/${conversation.id}`}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 border-l-2 px-4 py-3 transition",
                    active
                      ? "border-accent bg-surface-muted"
                      : unread
                        ? "border-transparent bg-accent/6 hover:bg-surface-muted/60"
                        : "border-transparent hover:bg-surface-muted/60",
                  ].join(" ")}
                >
                  <span className="relative shrink-0">
                    {conversation.type === "group" ? (
                      <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
                        <Users className="size-4" />
                      </span>
                    ) : (
                      <Avatar
                        name={conversation.title}
                        id={conversation.participants[0]?.id ?? conversation.id}
                      />
                    )}
                    {recentlyActive && (
                      <span
                        title="Active in the last few minutes"
                        className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface bg-success"
                      >
                        <span className="sr-only">Active recently</span>
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}
                      >
                        {conversation.title}
                      </span>
                      {last && (
                        <time
                          dateTime={last.createdAt.toISOString()}
                          className={`shrink-0 text-[11px] ${unread ? "font-medium text-accent" : "text-foreground-muted"
                            }`}
                        >
                          {isToday(last.createdAt)
                            ? messageTime(last.createdAt)
                            : dayLabel(last.createdAt)}
                        </time>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-xs ${unread ? "font-medium text-foreground" : "text-foreground-muted"
                          }`}
                      >
                        {/* `lastMessage` is `{}` on an empty conversation, normalised to null. */}
                        {last ? last.text || "…" : "No messages yet"}
                      </span>
                      {unread && (
                        <span className="size-2 shrink-0 rounded-full bg-accent">
                          <span className="sr-only">Unread</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ------------------------------------------------------------- footer */}
      <footer className="flex items-center gap-2.5 border-t border-border px-4 py-3">
        {user && <Avatar name={user.name} id={user.id} size={34} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate font-mono text-xs text-foreground-muted">{user?.phone}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-lg p-2 text-danger transition hover:bg-danger/10"
        >
          <LogOut className="size-4" />
        </button>
      </footer>

      {showNewChat && <NewChatDialog onClose={() => setShowNewChat(false)} />}
      {showNewGroup && <NewGroupDialog onClose={() => setShowNewGroup(false)} />}
    </aside>
  );
}
