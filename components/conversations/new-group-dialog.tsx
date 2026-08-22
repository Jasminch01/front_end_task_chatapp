"use client";

/**
 * Create a group: a name plus two or more other people.
 *
 * The server enforces "at least 3 members" and a non-empty name, and returns a
 * `details` array naming the field that failed — so the same rules are mirrored here
 * to catch it before the round trip, and the server's message is surfaced if it
 * disagrees.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Search, X } from "lucide-react";
import { conversations, users } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/chat/avatar";
import type { User } from "@/types/chat";

const MIN_QUERY = 2;
/** A group is 3 people, so 2 besides the creator. */
const MIN_OTHERS = 2;

export function NewGroupDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
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

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.userSearch(debounced),
    queryFn: () => users.search(debounced),
    enabled: debounced.length >= MIN_QUERY && !hasRegexChar,
  });

  const selectedIds = new Set(selected.map((s) => s.id));
  const results = (data ?? []).filter((u) => u.id !== user?.id && !selectedIds.has(u.id));

  function toggle(person: User) {
    // The server dedupes duplicate ids, but a picker that lets you add someone twice
    // is confusing regardless.
    setSelected((prev) =>
      prev.some((p) => p.id === person.id)
        ? prev.filter((p) => p.id !== person.id)
        : [...prev, person],
    );
    setTerm("");
  }

  const canCreate = name.trim().length > 0 && selected.length >= MIN_OTHERS && !creating;

  async function create() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const id = await conversations.createGroup(
        name.trim(),
        selected.map((s) => s.id),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      onClose();
      router.push(`/chat/${id}`);
    } catch (err) {
      setError(toUserMessage(err));
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-group-title"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="new-group-title" className="font-display text-lg font-semibold">
            New group
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
          <label htmlFor="group-name" className="mb-1.5 block text-sm font-medium">
            Group name
          </label>
          <input
            id="group-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Design Review"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="border-b border-border px-4 py-3">
          <p className="mb-1.5 text-sm font-medium">
            Members{" "}
            <span className="font-normal text-foreground-muted">
              — you plus at least {MIN_OTHERS}
            </span>
          </p>

          {selected.length > 0 && (
            <ul aria-label="Selected members" className="mb-2 flex flex-wrap gap-1.5">
              {selected.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => toggle(person)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1 pr-2 pl-1 text-xs font-medium text-accent transition hover:bg-accent/20"
                  >
                    <Avatar name={person.name} id={person.id} size={18} />
                    {person.name}
                    <X className="size-3" />
                    <span className="sr-only">Remove {person.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="size-4 shrink-0 text-foreground-muted" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by name to add…"
              aria-label="Search for people to add"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-foreground-muted/60"
            />
            {isFetching && <LoaderCircle className="size-4 animate-spin text-foreground-muted" />}
          </div>
        </div>

        <div className="max-h-52 min-h-0 flex-1 overflow-y-auto">
          {hasRegexChar && (
            <p className="px-4 py-5 text-center text-sm text-foreground-muted">
              Phone search isn&apos;t supported by the API. Search by name.
            </p>
          )}
          {!hasRegexChar && debounced.length >= MIN_QUERY && !isFetching && results.length === 0 && (
            <p className="px-4 py-5 text-center text-sm text-foreground-muted">
              Nobody else matches “{debounced}”.
            </p>
          )}
          <ul aria-label="Search results">
            {results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => toggle(person)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-surface-muted"
                >
                  <Avatar name={person.name} id={person.id} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{person.name}</span>
                    <span className="block truncate font-mono text-xs text-foreground-muted">
                      {person.phone}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : (
            <p className="text-xs text-foreground-muted">
              {selected.length < MIN_OTHERS
                ? `Add ${MIN_OTHERS - selected.length} more`
                : `${selected.length + 1} members`}
            </p>
          )}
          <button
            type="button"
            onClick={create}
            disabled={!canCreate}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {creating && <LoaderCircle className="size-3.5 animate-spin" />}
            Create group
          </button>
        </div>
      </div>
    </div>
  );
}
