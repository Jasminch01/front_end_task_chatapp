"use client";

/**
 * Start a 1-to-1 conversation: search → pick → navigate.
 *
 * Search on this API is case-sensitive, matches only from the start of a name, and
 * returns a 500 for any query containing a regex character — which every `+` phone
 * number does. The endpoint layer refuses those queries locally, and this component
 * explains the constraint rather than showing an empty list with no reason.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Search, X } from "lucide-react";
import { conversations, users } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/chat/avatar";

const MIN_QUERY = 2;

export function NewChatDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.userSearch(debounced),
    queryFn: () => users.search(debounced),
    enabled: debounced.length >= MIN_QUERY && !hasRegexChar,
  });

  // The caller comes back in their own search results.
  const results = (data ?? []).filter((u) => u.id !== user?.id);

  async function start(userId: string) {
    setStarting(userId);
    setError(null);
    try {
      const conversationId = await conversations.startDirect(userId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      onClose();
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      setError(toUserMessage(err));
      setStarting(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="new-chat-title" className="font-display text-lg font-semibold">
            New conversation
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-foreground-muted transition hover:bg-surface-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="size-4 shrink-0 text-foreground-muted" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search for someone by name"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-foreground-muted/60"
            />
            {isFetching && <LoaderCircle className="size-4 animate-spin text-foreground-muted" />}
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            Names match from the beginning and are case-sensitive — try{" "}
            <span className="font-mono">Ada</span>, not <span className="font-mono">ada</span>.
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {hasRegexChar && (
            <p className="px-4 py-6 text-center text-sm text-foreground-muted">
              Searching by phone number isn&apos;t supported by the API — it returns an
              error for numbers containing <span className="font-mono">+</span>. Search by
              name instead.
            </p>
          )}

          {!hasRegexChar && debounced.length < MIN_QUERY && (
            <p className="px-4 py-6 text-center text-sm text-foreground-muted">
              Type at least {MIN_QUERY} characters to search.
            </p>
          )}

          {!hasRegexChar && debounced.length >= MIN_QUERY && !isFetching && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-foreground-muted">
              Nobody matches “{debounced}”.
            </p>
          )}

          <ul aria-label="Search results">
            {results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => start(person.id)}
                  disabled={!!starting}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-muted disabled:opacity-60"
                >
                  <Avatar name={person.name} id={person.id} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{person.name}</span>
                    <span className="block truncate font-mono text-xs text-foreground-muted">
                      {person.phone}
                    </span>
                  </span>
                  {starting === person.id && (
                    <LoaderCircle className="size-4 animate-spin text-foreground-muted" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {error && (
            <p role="alert" className="px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
