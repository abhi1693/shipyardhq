export default function Loading() {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <div className="flex items-center gap-3 rounded-full border border-border/80 bg-white px-4 py-3 shadow-sm shadow-black/5">
        <svg
          className="h-5 w-5 animate-spin text-[color:var(--brand-1,#074e86)]"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-90"
            d="M22 12a10 10 0 0 0-10-10"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-sm font-medium text-foreground">
          Loading admin area...
        </span>
      </div>
    </div>
  )
}
