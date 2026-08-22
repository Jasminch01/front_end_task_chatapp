"use client";

/**
 * Surfaces the socket connection state.
 *
 * Worth doing: without it, a dropped socket looks exactly like "nobody is talking to
 * me", and the user never learns their messages stopped arriving. Quiet by default —
 * it only appears when something is wrong.
 */

import { WifiOff } from "lucide-react";
import type { ConnectionStatus } from "@/lib/socket";

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === "connected") return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-danger/10 px-4 py-1.5 text-xs font-medium text-danger"
    >
      <WifiOff className="size-3.5" />
      {status === "connecting"
        ? "Connecting to live updates…"
        : "Reconnecting — new messages may be delayed"}
    </div>
  );
}
