import { MessagesSquare } from "lucide-react";

/**
 * /chat with nothing selected — the empty right-hand pane on desktop.
 * On mobile the sidebar fills the screen, so this pane is hidden.
 */
export default function ChatIndexPage() {
  return (
    <section className="hidden flex-1 flex-col items-center justify-center px-6 text-center md:flex">
      <MessagesSquare className="mb-4 size-8 text-foreground-muted" strokeWidth={1.5} />
      <h1 className="font-display text-xl font-semibold">Pick a conversation</h1>
      <p className="mt-1 max-w-xs text-sm text-foreground-muted">
        Choose someone from the list, or start a new conversation to get going.
      </p>
    </section>
  );
}
