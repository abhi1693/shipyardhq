export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[var(--background)]"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="absolute h-32 w-32 animate-pulse rounded-full bg-gradient-to-br from-[var(--primary)]/20 via-[var(--foreground)]/5 to-[var(--primary)]/20 blur-2xl" />
        <div className="absolute h-28 w-28 animate-[spin_6s_linear_infinite] rounded-full border border-[var(--foreground)]/10" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[var(--foreground)]/10 bg-[var(--background)]/60 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.4em] text-[var(--foreground)]/60">
        <span className="h-2 w-2 animate-ping rounded-full bg-[var(--primary)]" />
        <span className="tracking-[0.3em]">Preparing Shipyard</span>
      </div>

      <span className="sr-only">Loading Shipyard</span>
    </div>
  )
}
