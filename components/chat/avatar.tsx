import { avatarTint, initials } from "@/lib/format";

/**
 * The API has no avatar field, so initials on a deterministic tint is the whole
 * implementation — deterministic so one person is the same colour everywhere.
 */
export function Avatar({
  name,
  id,
  size = 40,
}: {
  name: string;
  id: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: avatarTint(id), width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
    >
      {initials(name)}
    </span>
  );
}
