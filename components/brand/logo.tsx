type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M12 6 h9 a5 5 0 0 1 5 5 v5 a5 5 0 0 1 -5 5 h-4 l-5 4 v-4 h0 a5 5 0 0 1 -5 -5 v-5 a5 5 0 0 1 5 -5 z"
        fill="#ffffff"
      />
      <circle cx="12" cy="13.5" r="1.85" fill="var(--accent)" />
      <circle cx="16.5" cy="13.5" r="1.85" fill="var(--accent)" />
      <circle cx="21" cy="13.5" r="1.85" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-display font-bold tracking-tight">yap</span>
    </span>
  );
}
