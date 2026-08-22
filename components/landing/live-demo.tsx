"use client";

/**
 * The landing page's centrepiece: a working chat panel, not a screenshot.
 *
 * It renders the *same* MessageBubble component the real app uses, driven by a scripted
 * local transcript instead of the API. The visitor can type and send, and gets a scripted
 * reply — so the page doesn't describe the product, it is the product, one interaction
 * deep.
 *
 * Two things this buys beyond looking good:
 *   - it is an honest demo: if the chat components regress, this regresses with them
 *   - it needs no account and no API call, so it still works when the demo backend
 *     is asleep on its free tier
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { Message } from "@/types/chat";

const ME = "you";
const THEM = "ada";

const SCRIPT: { from: string; text: string; delay: number }[] = [
  { from: THEM, text: "did the deploy go out?", delay: 700 },
  { from: ME, text: "just now — it's live", delay: 1400 },
  { from: THEM, text: "no way you got the scroll thing working", delay: 1500 },
  { from: ME, text: "scroll up while I'm typing. it won't drag you back down 👇", delay: 1800 },
];

/** Canned replies so a visitor's message gets an answer that fits the conversation. */
const REPLIES = [
  "typed right into the same component the real app uses.",
  "no account, no API call — this one runs entirely in your browser.",
  "scroll up and send another. the view stays where you put it.",
  "that's the whole product, one interaction deep.",
];

let seq = 0;
const makeMessage = (senderId: string, text: string): Message => ({
  id: `demo-${seq++}`,
  conversationId: "demo",
  senderId,
  text,
  createdAt: new Date(),
  status: "sent",
});

export function LiveDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [started, setStarted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const replyIndex = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  // Same rule as the real app: only follow the latest if the reader is at the bottom.
  const maybeScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    maybeScroll();
  }, [messages, maybeScroll]);

  // Start the transcript only once the demo is actually on screen — playing it out
  // above the fold while the visitor is still reading the headline wastes it.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || started) return;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setStarted(true),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // No theatre for anyone who asked for less motion — just show the conversation.
      // matchMedia isn't readable during render on the server, so this resolves here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(SCRIPT.map((s) => makeMessage(s.from, s.text)));
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    SCRIPT.forEach((line) => {
      elapsed += line.delay;
      timers.push(
        setTimeout(() => setMessages((prev) => [...prev, makeMessage(line.from, line.text)]), elapsed),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [started]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 60;
  }

  function send() {
    const text = value.trim();
    if (!text) return;

    setValue("");
    pinnedRef.current = true;
    setMessages((prev) => [...prev, makeMessage(ME, text)]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = REPLIES[replyIndex.current % REPLIES.length];
      replyIndex.current += 1;
      setMessages((prev) => [...prev, makeMessage(THEM, reply)]);
    }, 1100);
  }

  return (
    <div
      ref={rootRef}
      className="mx-auto flex h-120 w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/5"
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-[oklch(0.72_0.13_330)] text-[13px] font-semibold text-black/70">
          AL
        </span>
        <div className="min-w-0">
          <p className="text-[15px] leading-tight font-semibold">Ada Lovelace</p>
          <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <span className="size-1.5 rounded-full bg-success" />
            {isTyping ? "typing…" : "online"}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="thin-scrollbar flex-1 overflow-y-auto"
      >
        <div className="flex min-h-full flex-col justify-end px-4 py-4">
          <ul className="flex flex-col gap-0.5">
            {messages.map((message, i) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === ME}
                showTime={
                  i === messages.length - 1 || messages[i + 1]?.senderId !== message.senderId
                }
                onRetry={() => {}}
                onDiscard={() => {}}
              />
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border bg-background px-4 py-3">
        <div className="flex items-end gap-2">
          <label htmlFor="demo-composer" className="sr-only">
            Try the composer
          </label>
          <input
            id="demo-composer"
            value={value}
            placeholder="Try it — type something…"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 text-[15px] outline-none transition placeholder:text-foreground-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={send}
            disabled={!value.trim()}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-35"
          >
            <SendHorizontal className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
