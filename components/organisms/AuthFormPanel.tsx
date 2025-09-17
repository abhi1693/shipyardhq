import Link from "next/link"
import { SignIn, SignUp } from "@clerk/nextjs"

interface AuthFormPanelProps {
  mode: "sign-in" | "sign-up"
}

export default function AuthFormPanel({ mode }: AuthFormPanelProps) {
  const isSignIn = mode === "sign-in"

  return (
    <div className="flex items-center justify-center p-6 lg:p-16">
      <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-800">
            {isSignIn ? "Sign in to ShipYardHQ" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isSignIn
              ? "Dock your product or discover new micro‑SaaS gems."
              : "Join the crew and showcase your micro‑SaaS project."}
          </p>
        </div>

        {isSignIn ? (
          <SignIn
            appearance={{
              elements: {
                card: "shadow-lg border border-zinc-100",
              },
            }}
            forceRedirectUrl="/member"
          />
        ) : (
          <SignUp
            appearance={{
              elements: {
                card: "shadow-lg border border-zinc-100",
              },
            }}
            forceRedirectUrl="/member"
          />
        )}

        <p className="text-sm text-zinc-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
