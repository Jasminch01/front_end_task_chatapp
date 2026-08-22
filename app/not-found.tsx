import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo size={48} />
      <p className="mt-6 font-mono text-sm font-medium text-accent">404</p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
        This page went quiet
      </h1>
      <p className="mt-2 max-w-sm text-foreground-muted">
        The page you&apos;re looking for doesn&apos;t exist, or it moved somewhere else.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-5 font-medium text-accent-foreground transition hover:opacity-90"
        >
          Back home
        </Link>
        <Link
          href="/chat"
          className="inline-flex h-11 items-center rounded-xl border border-border px-5 font-medium transition hover:bg-surface-muted"
        >
          Open yap
        </Link>
      </div>
    </main>
  );
}
