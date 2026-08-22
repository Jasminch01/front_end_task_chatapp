"use client";

/**
 * One message.
 *
 * Outgoing and incoming are distinguished on three axes — alignment, fill, and corner
 * shape — so the difference survives a colour-blind reader and a greyscale screenshot.
 * A visually-hidden prefix carries the same information to a screen reader.
 */

import { LoaderCircle, TriangleAlert } from "lucide-react";
import { fullTimestamp, messageTime } from "@/lib/format";
import type { Message } from "@/types/chat";

type Props = {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  /** Only the last bubble of a group shows the timestamp. */
  showTime: boolean;
  onRetry: (message: Message) => void;
  onDiscard: (message: Message) => void;
};

export function MessageBubble({
  message,
  isOwn,
  senderName,
  showTime,
  onRetry,
  onDiscard,
}: Props) {
  const failed = message.status === "failed";
  const pending = message.status === "pending";

  return (
    <li className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {senderName && (
        <span className="mb-1 px-1 text-xs font-medium text-foreground-muted">
          {senderName}
        </span>
      )}

      <div
        className={[
          "max-w-[min(78%,34rem)] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed",
          // `break-words` matters: a long unbroken URL otherwise blows out the column.
          "break-words whitespace-pre-wrap",
          isOwn
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md border border-border bg-surface text-foreground",
          pending ? "opacity-70" : "",
          failed ? "border-danger/50 bg-danger/10 text-foreground" : "",
        ].join(" ")}
      >
        <span className="sr-only">{isOwn ? "You said: " : `${senderName ?? "They"} said: `}</span>
        {message.text}
      </div>

      <div
        className={`mt-1 flex items-center gap-1.5 px-1 text-[11px] text-foreground-muted ${
          isOwn ? "flex-row-reverse" : ""
        }`}
      >
        {showTime && !failed && (
          <time dateTime={message.createdAt.toISOString()} title={fullTimestamp(message.createdAt)}>
            {messageTime(message.createdAt)}
          </time>
        )}

        {pending && <LoaderCircle className="size-3 animate-spin" aria-label="Sending" />}

        {failed && (
          <span className="flex items-center gap-1.5 text-danger">
            <TriangleAlert className="size-3" />
            Not sent
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="underline underline-offset-2 hover:no-underline"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard(message)}
              className="underline underline-offset-2 hover:no-underline"
            >
              Discard
            </button>
          </span>
        )}
      </div>
    </li>
  );
}
