export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill="none" stroke="var(--accent)" strokeWidth="7" />
      <circle cx="32" cy="32" r="7" fill="var(--ink)" />
    </svg>
  )
}
