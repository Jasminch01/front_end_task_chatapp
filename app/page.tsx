import Link from "next/link";
import {
  ArrowRight,
  BookText,
  MessageCircle,
  MoveDown,
  Radio,
  Users,
  Zap,
} from "lucide-react";
import { LiveDemo } from "@/components/landing/live-demo";

/**
 * Part 2 — the landing page.
 *
 * Server component: no session, no data, so it ships almost no JS. The only client
 * island is the live demo, which is the point of the page.
 */

const CAPABILITIES = [
  {
    icon: Radio,
    title: "Messages land as they're sent",
    body: "A single socket feeds every conversation you're in — the open thread and the ones you haven't clicked. No polling, no refresh button.",
  },
  {
    icon: MoveDown,
    title: "It follows you, not the other way round",
    body: "New messages pull the view down only if you're already at the bottom. Scrolled up reading? Nothing moves — a pill tells you what arrived.",
  },
  {
    icon: Users,
    title: "Two people or twenty",
    body: "Group threads carry names, membership and admins, and use the same message list as a one-to-one chat.",
  },
  {
    icon: Zap,
    title: "Sends survive bad networks",
    body: "Your message appears the moment you press Enter. If the request fails it's marked, kept, and one tap from being retried — never silently dropped.",
  },
];

const STEPS = [
  { n: "01", title: "Type your number", body: "No password. No email. No confirmation link." },
  { n: "02", title: "Pick a name", body: "Whatever you want to be called. New number? The account is created for you." },
  { n: "03", title: "Start talking", body: "Search someone by name, open a thread, say hello." },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28">
        {/* One soft bloom behind the headline, the only decoration on the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
          style={{ background: "var(--accent)" }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground-muted">
              <MessageCircle className="size-3.5 text-accent" />
              Real-time chat, no signup step
            </div>

            <h1 className="font-display text-[clamp(2.6rem,6vw,4.25rem)] leading-[0.98] font-extrabold tracking-tight text-balance">
              Conversations that keep up.
            </h1>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground-muted text-pretty">
              Pulse is a chat client built around the part everyone gets wrong — the
              message list. Live delivery, sends that survive a dropped connection, and a
              scroll position that respects where you actually are.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 font-medium text-accent-foreground transition hover:opacity-90"
              >
                Start a conversation
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center rounded-xl border border-border px-6 font-medium transition hover:bg-surface-muted"
              >
                How it works
              </a>
            </div>

            <p className="mt-5 text-sm text-foreground-muted">
              Takes about ten seconds. Your phone number is the account.
            </p>
          </div>

          {/* Not a screenshot — the real components, running. */}
          <div className="w-full lg:w-[26rem]">
            <LiveDemo />
            <p className="mt-3 text-center text-xs text-foreground-muted">
              This is the actual chat panel, running on a scripted transcript.{" "}
              <span className="text-foreground">Type in it.</span>
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- capabilities */}
      <section className="border-t border-border bg-surface/40 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display max-w-lg text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            The details you only notice when they&apos;re missing.
          </h2>

          <div className="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-accent">
                  <Icon className="size-[18px]" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-foreground-muted text-pretty">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- how it works */}
      <section id="how" className="scroll-mt-8 border-t border-border px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display max-w-lg text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            There is no signup. That&apos;s not a shortcut — it&apos;s the design.
          </h2>

          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="border-t-2 border-accent pt-5">
                <span className="font-mono text-xs font-medium text-accent">{step.n}</span>
                <h3 className="font-display mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-foreground-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------------ cta */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[clamp(2rem,5vw,3rem)] leading-tight font-extrabold tracking-tight text-balance">
            Someone&apos;s waiting to hear from you.
          </h2>
          <p className="mt-4 text-lg text-foreground-muted">
            Type a number, pick a name, and you&apos;re in.
          </p>
          <Link
            href="/login"
            className="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-7 font-medium text-accent-foreground transition hover:opacity-90"
          >
            Open Pulse
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------------------- footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-semibold">Pulse</p>
            <p className="mt-1 text-sm text-foreground-muted">
              Built as a take-home. Set in Bricolage Grotesque and Plus Jakarta Sans.
            </p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/login" className="transition hover:text-accent">
              Open the app
            </Link>
            <a
              href="https://frontend-task-chatapp.onrender.com/docs/"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 transition hover:text-accent"
            >
              <BookText className="size-4" />
              API docs
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
