import Link from "next/link"
import { Button } from "@/components/atoms/button"
import {
  AUTH_DISABLED_MESSAGE,
  AUTH_DISABLED_TITLE,
} from "@/lib/auth/availability"

type AuthUnavailablePanelProps = {
  mode: "sign-in" | "sign-up"
}

export default function AuthUnavailablePanel({
  mode,
}: AuthUnavailablePanelProps) {
  const actionLabel = mode === "sign-in" ? "Sign in" : "Create account"

  return (
    <div className="flex items-center justify-center px-6 py-12 lg:px-16 lg:py-20">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          {actionLabel}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          {AUTH_DISABLED_TITLE}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {AUTH_DISABLED_MESSAGE}
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to Shipyard</Link>
        </Button>
      </section>
    </div>
  )
}
