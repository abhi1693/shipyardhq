import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Account Suspended",
}

export default function SuspendedAccountPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold">Your account is currently suspended</h1>
      <p className="text-muted-foreground">
        Please contact support if you believe this is a mistake. You no longer
        have access to member or admin features while your account is suspended
        or terminated.
      </p>
      <Link
        href="mailto:support@shipyardhq.com"
        className="text-primary underline-offset-4 hover:underline"
      >
        Contact support
      </Link>
    </main>
  )
}
