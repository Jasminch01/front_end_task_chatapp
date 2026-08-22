"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { Message } from "@/types/chat";

const ME = "you";
const THEM = "ada";

/** Cycled endlessly, so the panel is always mid-conversation. */
const SCRIPT: { from: string; text: string }[] = [
  { from: THEM, text: "did the deploy go out?" },
  { from: ME, text: "just now — it's live" },
  { from: THEM, text: "no way you got the scroll thing working" },
  { from: ME, text: "scroll up while this is running. it won't drag you back down 👇" },
  { from: THEM, text: "ok that's the bit everyone gets wrong" },
  { from: ME, text: "a pill shows up instead. your place stays your place" },
  { from: THEM, text: "and if the socket drops?" },
  { from: ME, text: "it refetches on reconnect. nothing goes missing quietly" },
  { from: THEM, text: "what about sends that fail" },
  { from: ME, text: "kept, marked, one tap to retry. your text is never thrown away" },
  { from: THEM, text: "nice. groups too?" },
  { from: ME, text: "same message list, plus names and admins" },
];

/** Replies to anything the visitor types, so their message isn't ignored. */
const REPLIES = [
  "you just typed into the same component the real app uses.",
  "no account, no API call — this one runs entirely in your browser.",
  "try scrolling up and sending another. the view stays put.",
  "that's the whole product, one interaction deep.",
];

/** Keep the DOM small and the conversation feeling like it's always in motion. */
const MAX_VISIBLE = 12;

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

  const scriptIndex = useRef(0);
  const replyIndex = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Set while the visitor is being answered, so the loop doesn't talk over them. */
  const interrupted = useRef(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  const push = useCallback((senderId: string, text: string) => {
    setMessages((prev) => [...prev, makeMessage(senderId, text)].slice(-MAX_VISIBLE));
  }, []);

  // The same rule as the real app: only follow the latest if the reader is at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Start only once the panel is actually on screen — playing the transcript out while
  // the visitor is still reading the headline wastes it.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || started) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setStarted(true),
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // No looping theatre for anyone who asked for less motion — show a finished
      // conversation and leave the composer working.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(SCRIPT.slice(0, 6).map((s) => makeMessage(s.from, s.text)));
      return;
    }

    const track = (t: ReturnType<typeof setTimeout>) => {
      timers.current.push(t);
      return t;
    };

    /**
     * One step of the loop. A chained timeout rather than an interval, so a slow tab
     * can't stack overlapping turns on top of each other.
     */
    const step = () => {
      // The visitor is mid-exchange — wait rather than interrupting them.
      if (interrupted.current || document.hidden) {
        track(setTimeout(step, 1200));
        return;
      }

      const line = SCRIPT[scriptIndex.current % SCRIPT.length];
      scriptIndex.current += 1;
      const incoming = line.from === THEM;

      if (incoming) setIsTyping(true);

      track(
        setTimeout(
          () => {
            // Re-check: the visitor may have sent something while this turn was
            // already in flight, and a scripted line landing between their message
            // and its reply reads as the demo talking over them.
            if (interrupted.current) {
              scriptIndex.current -= 1;
              setIsTyping(false);
              track(setTimeout(step, 1200));
              return;
            }

            setIsTyping(false);
            push(line.from, line.text);
            track(setTimeout(step, 1500 + Math.random() * 1200));
          },
          incoming ? 900 : 250,
        ),
      );
    };

    track(setTimeout(step, 600));

    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      timers.current = [];
    };
  }, [started, push]);

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
    push(ME, text);

    // Hold the loop, answer the visitor, then let it pick up again.
    interrupted.current = true;
    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      push(THEM, REPLIES[replyIndex.current % REPLIES.length]);
      replyIndex.current += 1;
      interrupted.current = false;
    }, 1100);
    timers.current.push(t);
  }

  return (
    <div
      ref={rootRef}
      className="mx-auto flex h-120 w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/5"
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-[oklch(0.55_0.15_330)] text-[13px] font-semibold text-white">
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
                onRetry={() => { }}
                onDiscard={() => { }}
              />
            ))}
          </ul>

          {isTyping && (
            <div className="mt-1.5 flex items-center gap-1 px-1" aria-hidden>
              <span className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="size-1.5 animate-bounce rounded-full bg-foreground-muted/60"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          )}
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
            placeholder="Jump in — type something…"
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
