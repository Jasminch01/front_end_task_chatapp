/**
 * Time formatting for the chat surface.
 *
 * Everything renders in the viewer's local timezone. That means two people in different
 * zones can see the same message under different day dividers — the correct trade, since
 * the alternative is showing someone a date that isn't theirs.
 */

import { format, isSameDay, isToday, isYesterday, differenceInMinutes } from "date-fns";

/** 14:32 — tabular figures are applied via CSS so the digits don't jitter. */
export function messageTime(date: Date): string {
  return format(date, "HH:mm");
}

/** Full timestamp for the `title` attribute and `<time datetime>`. */
export function fullTimestamp(date: Date): string {
  return format(date, "EEEE d MMMM yyyy, HH:mm");
}

export function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "d MMMM yyyy");
}

/** A day boundary breaks a sender group even when the sender hasn't changed. */
export function startsNewDay(current: Date, previous: Date | undefined): boolean {
  return !previous || !isSameDay(current, previous);
}

/**
 * Consecutive messages from one person collapse into a group. A long pause breaks it
 * too — five minutes apart is a new thought, not the same burst.
 */
export function startsNewGroup(
  senderId: string,
  date: Date,
  previousSenderId: string | undefined,
  previousDate: Date | undefined,
): boolean {
  if (previousSenderId !== senderId) return true;
  if (!previousDate) return true;
  if (!isSameDay(date, previousDate)) return true;
  return differenceInMinutes(date, previousDate) >= 5;
}

/** Deterministic avatar tint, so one person is the same colour on every device. */
export function avatarTint(id: string): string {
  const hues = [255, 190, 150, 20, 330, 280, 95];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  // L=0.55 keeps white initials above 4.3:1 on every hue in the set.
  return `oklch(0.55 0.15 ${hues[sum % hues.length]})`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
