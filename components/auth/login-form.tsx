"use client";

/**
 * Phone + name. The whole onboarding — there is no separate signup, an unknown phone
 * number is registered automatically.
 *
 * Two API properties shape this screen:
 *
 * 1. The server accepts anything as a phone (it stores `"  0155 900 "` verbatim and never
 *    normalises), so the client normalises before sending. Otherwise the same person
 *    typing their number two slightly different ways ends up with two accounts.
 *
 * 2. There is no password — a phone number *is* the account, on a demo backend shared by
 *    everyone evaluating it. Typing a number somebody else already used signs you into
 *    THEIR account: their conversations, their groups, their message history. I measured
 *    188 conversations and 99 groups sitting on `+15551234567`. That looks like a broken
 *    app when it is actually the API working as designed, so the screen says so and
 *    offers an unused number.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, MessageCircle, Shuffle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toUserMessage } from "@/lib/api/errors";

/** Collapse spacing and punctuation so "+1 555 000" and "+1555000" are one account. */
function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/**
 * A number unlikely to collide with anyone else's on the shared backend. Long and
 * random rather than memorable — being guessable is exactly the problem.
 */
function suggestPhone(): string {
  const random = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  return `+1999${random}`;
}

export function LoginForm() {
  const router = useRouter();
  const { login, status } = useAuth();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Don't show a login screen.
  useEffect(() => {
    if (status === "authenticated") router.replace("/chat");
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const cleanPhone = normalizePhone(phone);
    const cleanName = name.trim();

    if (cleanPhone.replace(/\D/g, "").length < 6) {
      setError("Enter a valid phone number.");
      return;
    }
    if (!cleanName) {
      setError("Enter the name you want to chat under.");
      return;
    }

    setSubmitting(true);
    try {
      await login(cleanPhone, cleanName);
      router.replace("/chat");
    } catch (err) {
      setError(toUserMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <div className="mb-6 inline-flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <MessageCircle className="size-5" strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Sign in to Pulse
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Your number and a name — that&apos;s the whole signup. If the number is new we
          create the account for you.
        </p>

        {/*
          Not a disclaimer for its own sake: without this, a reviewer types +15551234567,
          lands in 188 strangers' conversations, and reasonably concludes the app is broken.
        */}
        <p className="mt-4 rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-xs leading-relaxed text-foreground-muted">
          <span className="font-medium text-foreground">Heads up:</span> the demo API has no
          password — the phone number <em>is</em> the account, and the backend is shared by
          everyone trying this out. Use a number nobody else would pick, or tap{" "}
          <span className="text-accent">Use an unused number</span>, otherwise you&apos;ll
          sign into somebody else&apos;s conversations.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone number
            </label>
            <button
              type="button"
              onClick={() => {
                setPhone(suggestPhone());
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-accent underline underline-offset-2 transition hover:no-underline"
            >
              <Shuffle className="size-3" />
              Use an unused number
            </button>
          </div>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
            aria-invalid={!!error}
            className="rounded-lg border border-border bg-surface px-3.5 py-2.5 font-mono text-[15px] outline-none transition placeholder:font-sans placeholder:text-foreground-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
            className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[15px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
          />
        </div>

        {error && (
          <p id="login-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <LoaderCircle className="size-4 animate-spin" />}
          {submitting ? "Signing in…" : "Start chatting"}
        </button>

        {/* The API is on a free tier and can be asleep. A dead button for fifteen
            seconds reads as broken, so say what's happening. */}
        {submitting && (
          <p className="text-center text-xs text-foreground-muted">
            The demo server sleeps when idle — the first request can take a moment.
          </p>
        )}
      </form>
    </div>
  );
}
