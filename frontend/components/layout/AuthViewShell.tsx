import type { PropsWithChildren } from "react"

export default function AuthViewShell({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Gentle global backdrop so auth routes feel like a shared nautical space */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[color:var(--brand-1)/0.12] blur-3xl" />
        <div className="absolute -bottom-40 right-[-8rem] h-96 w-96 rounded-full bg-sky-200/45 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {children}
      </div>
    </div>
  )
}
