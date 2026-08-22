"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BOTTOM_TOLERANCE_PX = 80;

export function useStickToBottom() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPinned, setIsPinned] = useState(true);

  // Ref mirror, so scroll handlers and effects read the current value without
  // re-subscribing on every change.
  const pinnedRef = useRef(true);
  const didInitialJump = useRef(false);
  const anchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  const setPinned = useCallback((next: boolean) => {
    pinnedRef.current = next;
    setIsPinned(next);
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = containerRef.current;
      if (!el) return;

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      el.scrollTo({ top: el.scrollHeight, behavior: prefersReduced ? "auto" : behavior });
      setPinned(true);
    },
    [setPinned],
  );

  // Track whether the user is at the bottom. A resize (the mobile keyboard opening)
  // is not a user scroll and must not un-pin the list, so this only runs on scroll.
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance <= BOTTOM_TOLERANCE_PX);
  }, [setPinned]);

  /** Call immediately before prepending an older page. */
  const captureAnchor = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    anchorRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
  }, []);


  const clearAnchor = useCallback(() => {
    anchorRef.current = null;
  }, []);

  const restoreAnchor = useCallback(() => {
    const el = containerRef.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;

    const delta = el.scrollHeight - anchor.scrollHeight;
    if (delta > 0) el.scrollTop = anchor.scrollTop + delta;
    anchorRef.current = null;
  }, []);

  /** Jump to the bottom the first time content exists, with no animation. */
  const jumpOnFirstContent = useCallback((hasContent: boolean) => {
    const el = containerRef.current;
    if (!el || didInitialJump.current || !hasContent) return;
    didInitialJump.current = true;
    el.scrollTop = el.scrollHeight;
  }, []);

  /** Reset when switching conversations, so the next one jumps to its own bottom. */
  const reset = useCallback(() => {
    didInitialJump.current = false;
    anchorRef.current = null;
    pinnedRef.current = true;
    setIsPinned(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return {
    containerRef,
    isPinned,
    pinnedRef,
    scrollToBottom,
    captureAnchor,
    clearAnchor,
    restoreAnchor,
    jumpOnFirstContent,
    reset,
  };
}
