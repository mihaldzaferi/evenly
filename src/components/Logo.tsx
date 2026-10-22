export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <rect x="16" y="22" width="32" height="6" rx="3" fill="#fff" />
      <rect x="16" y="36" width="32" height="6" rx="3" fill="#fff" />
    </svg>
  )
}
