"use client";

/**
 * The input. Small surface, disproportionate share of the perceived quality.
 *
 * The server accepts `""` and `"   "` and stores them, so the empty-message rule is
 * entirely enforced here — and it has to cover the Enter key, not just the button.
 * Disabling only the button still lets Enter through.
 */

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";

type Props = {
  conversationId: string;
  disabled?: boolean;
  onSend: (text: string) => void | Promise<void>;
};

export function MessageComposer({ conversationId, disabled, onSend }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = value.trim().length > 0 && !disabled;

  // Drafts are kept per conversation: type half a message, check something else,
  // come back, and the text is still there.
  const draftsRef = useRef(new Map<string, string>());
  const previousIdRef = useRef(conversationId);

  useEffect(() => {
    const previousId = previousIdRef.current;
    if (previousId !== conversationId) {
      draftsRef.current.set(previousId, value);
      setValue(draftsRef.current.get(conversationId) ?? "");
      previousIdRef.current = conversationId;
    }
    // `value` is deliberately not a dependency — this only runs on a conversation switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;

    setValue("");
    draftsRef.current.delete(conversationId);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Keeping focus after send is the difference between usable and infuriating.
      textareaRef.current.focus();
    }
    void onSend(text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    // Don't submit mid-IME-composition (Japanese, Korean, Chinese input).
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    if (canSend) submit();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-border bg-background px-4 py-3 sm:px-6"
    >
      <div className="flex items-end gap-2">
        <label htmlFor="composer" className="sr-only">
          Write a message
        </label>
        <textarea
          id="composer"
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="Write a message…"
          onChange={(e) => {
            setValue(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={handleKeyDown}
          className="thin-scrollbar max-h-40 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-[15px] leading-relaxed outline-none transition placeholder:text-foreground-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-35"
        >
          <SendHorizontal className="size-4" />
        </button>
      </div>
    </form>
  );
}
