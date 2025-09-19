import type { PropsWithChildren } from "react"

export default function AuthViewShell({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100 text-slate-900">
      {/* Gentle global backdrop so auth routes feel like a shared nautical space */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(191,219,254,0.35),_transparent_70%)]" />
        <div className="absolute inset-x-[-20%] top-[-40%] h-[28rem] rounded-[55%] bg-[radial-gradient(circle,_rgba(59,130,246,0.2),_transparent_75%)] blur-[80px]" />
      </div>

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {children}
      </div>
    </div>
  )
}
