"use client";

/**
 * Group management: rename, members, add, remove, promote, leave.
 *
 * Two things the API forces on this UI:
 *   - There is no demote endpoint, so promotion is a one-way door. The confirmation
 *     says so, rather than letting the user find out afterwards.
 *   - Leaving and being removed are the same DELETE call with your own id — but they
 *     are very different actions to a person, so leaving is confirmed separately.
 *
 * Admin-only actions are hidden for non-admins, and the API still enforces it with a
 * 403 if anything slips through.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, LogOut, Pencil, Search, Shield, UserPlus, X } from "lucide-react";
import { conversations, users } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/chat/avatar";
import type { Conversation } from "@/types/chat";

const MIN_QUERY = 2;

export function GroupSettingsSheet({
  conversation,
  onClose,
}: {
  conversation: Conversation;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isAdmin = !!user && conversation.adminIds.includes(user.id);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(conversation.title);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 280);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasRegexChar = /[+*?()[\]{}\\^$|]/.test(debounced);
  const memberIds = new Set(conversation.participants.map((p) => p.id));

  const { data: searchResults } = useQuery({
    queryKey: queryKeys.userSearch(debounced),
    queryFn: () => users.search(debounced),
    enabled: isAdmin && debounced.length >= MIN_QUERY && !hasRegexChar,
  });

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    if (!user) return;
    if (!window.confirm(`Leave “${conversation.title}”? You'll stop receiving messages.`))
      return;

    await run("leave", () => conversations.removeParticipant(conversation.id, user.id));
    onClose();
    router.push("/chat");
  }

  async function promote(userId: string, personName: string) {
    if (
      !window.confirm(
        `Make ${personName} an admin? This can't be undone — the API has no way to remove admin rights.`,
      )
    )
      return;
    await run(`promote-${userId}`, () => conversations.promoteAdmin(conversation.id, userId));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-settings-title"
        className="flex h-full w-full max-w-sm flex-col border-l border-border bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="group-settings-title" className="font-display text-lg font-semibold">
            Group details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-foreground-muted transition hover:bg-surface-muted"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="thin-scrollbar flex-1 overflow-y-auto">
          {/* ------------------------------------------------------------ name */}
          <section className="border-b border-border px-4 py-4">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Group name"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  disabled={!name.trim() || busy === "rename"}
                  onClick={async () => {
                    await run("rename", () => conversations.rename(conversation.id, name.trim()));
                    setRenaming(false);
                  }}
                  aria-label="Save name"
                  className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-40"
                >
                  {busy === "rename" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display truncate text-xl font-semibold">
                    {conversation.title}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {conversation.participants.length} members
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setName(conversation.title);
                      setRenaming(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs transition hover:bg-surface-muted"
                  >
                    <Pencil className="size-3" />
                    Rename
                  </button>
                )}
              </div>
            )}
          </section>

          {/* --------------------------------------------------------- add member */}
          {isAdmin && (
            <section className="border-b border-border px-4 py-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <UserPlus className="size-3.5" />
                Add someone
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                <Search className="size-4 shrink-0 text-foreground-muted" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search by name…"
                  aria-label="Search people to add"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-muted/60"
                />
              </div>

              <ul className="mt-1.5">
                {(searchResults ?? []).slice(0, 6).map((person) => {
                  const already = memberIds.has(person.id);
                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        disabled={already || busy === `add-${person.id}`}
                        onClick={async () => {
                          await run(`add-${person.id}`, () =>
                            conversations.addParticipants(conversation.id, [person.id]),
                          );
                          setTerm("");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-surface-muted disabled:opacity-45"
                      >
                        <Avatar name={person.name} id={person.id} size={28} />
                        <span className="min-w-0 flex-1 truncate text-sm">{person.name}</span>
                        <span className="text-xs text-foreground-muted">
                          {already ? "Already in" : "Add"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ----------------------------------------------------------- members */}
          <section className="px-4 py-4">
            <p className="mb-2 text-sm font-medium">Members</p>
            <ul className="flex flex-col">
              {conversation.participants.map((person) => {
                const personIsAdmin = conversation.adminIds.includes(person.id);
                const isMe = person.id === user?.id;
                const working = busy === `remove-${person.id}` || busy === `promote-${person.id}`;

                return (
                  <li key={person.id} className="flex items-center gap-2.5 py-2">
                    <Avatar name={person.name} id={person.id} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {person.name}
                          {isMe && <span className="text-foreground-muted"> (you)</span>}
                        </span>
                        {personIsAdmin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                            <Shield className="size-2.5" />
                            Admin
                          </span>
                        )}
                      </span>
                      <span className="block truncate font-mono text-xs text-foreground-muted">
                        {person.phone}
                      </span>
                    </span>

                    {working && (
                      <LoaderCircle className="size-4 animate-spin text-foreground-muted" />
                    )}

                    {isAdmin && !isMe && !working && (
                      <span className="flex items-center gap-1">
                        {!personIsAdmin && (
                          <button
                            type="button"
                            onClick={() => promote(person.id, person.name)}
                            className="rounded-md px-1.5 py-1 text-xs text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
                          >
                            Make admin
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            run(`remove-${person.id}`, () =>
                              conversations.removeParticipant(conversation.id, person.id),
                            )
                          }
                          className="rounded-md px-1.5 py-1 text-xs text-danger transition hover:bg-danger/10"
                        >
                          Remove
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <footer className="border-t border-border px-4 py-3">
          {error && (
            <p role="alert" className="mb-2 text-sm text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={leave}
            disabled={busy === "leave"}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
          >
            {busy === "leave" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Leave group
          </button>
        </footer>
      </div>
    </div>
  );
}
