"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo size={48} />
      <p className="mt-6 font-mono text-sm font-medium text-danger">Error</p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-foreground-muted">
        An unexpected error broke this page. You can try again, or head back and start over.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-medium text-accent-foreground transition hover:opacity-90"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl border border-border px-5 font-medium transition hover:bg-surface-muted"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
