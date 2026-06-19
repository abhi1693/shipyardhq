"use client"

import Link from "next/link"
import { useClerk, useSignIn } from "@clerk/nextjs"
import type { OAuthStrategy } from "@clerk/nextjs/types"
import type { FormEvent } from "react"
import { useState } from "react"

import { BrandLogo } from "@/components/atoms/brand-logo"
import { BRAND_NAME } from "@/lib/brand"
import { HOME_PATH, LEGAL_PATH, MEMBER_BASE_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

interface AuthLoginPanelProps {
  redirectUrl?: string
}

type ClerkWithConnectionSettings = ReturnType<typeof useClerk> & {
  __internal_environment?: {
    userSettings?: {
      socialProviderStrategies?: OAuthStrategy[]
    }
  }
}

type AuthErrorPayload = {
  errors?: Array<{
    longMessage?: string
    message?: string
  }>
  message?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const payload = error as AuthErrorPayload
    return (
      payload.errors?.[0]?.longMessage ??
      payload.errors?.[0]?.message ??
      payload.message ??
      fallback
    )
  }

  return fallback
}

function normalizeProvider(provider: string) {
  return provider.replace(/^oauth_/, "").replace(/^custom_/, "")
}

function formatProviderName(provider: string) {
  return normalizeProvider(provider)
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function GoogleLogo() {
  return (
    <svg height="18" viewBox="0 0 18 18" width="18" aria-hidden>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.711c-.18-.54-.282-1.117-.282-1.711 0-.594.102-1.17.282-1.711V4.957H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.043l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.443 2.048.957 4.957l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

function ProviderLogo({ strategy }: { strategy: OAuthStrategy }) {
  const provider = normalizeProvider(strategy)

  if (provider === "google") {
    return <GoogleLogo />
  }

  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded bg-[#eff4ff] text-[10px] font-bold uppercase text-[#0051d5]">
      {provider.charAt(0)}
    </span>
  )
}

export default function AuthLoginPanel({ redirectUrl }: AuthLoginPanelProps) {
  const finalRedirectUrl = redirectUrl ?? MEMBER_BASE_PATH
  const clerk = useClerk() as ClerkWithConnectionSettings
  const { signIn } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pendingStrategy, setPendingStrategy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const enabledOAuthStrategies =
    clerk.__internal_environment?.userSettings?.socialProviderStrategies ?? []
  const isBusy = pendingStrategy !== null

  async function handleOAuth(strategy: OAuthStrategy) {
    setPendingStrategy(strategy)
    setError(null)

    try {
      const { error: authError } = await signIn.sso({
        strategy,
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: finalRedirectUrl,
      })

      if (authError) {
        throw authError
      }
    } catch (authError) {
      setError(getErrorMessage(authError, "Unable to continue with provider"))
      setPendingStrategy(null)
    }
  }

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setPendingStrategy("password")
    setError(null)

    try {
      const { error: passwordError } = await signIn.password({
        identifier: email.trim(),
        password,
      })

      if (passwordError) {
        throw passwordError
      }

      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            window.location.href = decorateUrl(finalRedirectUrl)
          },
        })

        if (finalizeError) {
          throw finalizeError
        }

        return
      }

      setError("Additional verification is required for this account.")
    } catch (authError) {
      setError(getErrorMessage(authError, "Unable to sign in"))
    } finally {
      setPendingStrategy(null)
    }
  }

  return (
    <main
      className={cn(
        "relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f9ff] p-6 font-sans text-[#0b1c30]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle,#E2E8F0_1px,transparent_1px)] before:bg-[size:32px_32px] before:opacity-40",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_50%,rgba(248,250,255,0.92)_0%,rgba(239,244,255,0.54)_100%)]",
      )}
    >
      <section className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_12px_rgba(15,23,42,0.05)] md:p-10">
          <header className="mb-10 flex flex-col items-center text-center">
            <Link
              href={HOME_PATH}
              className="mb-6 inline-flex items-center justify-center gap-2 text-[#0b1c30] transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/40 focus-visible:ring-offset-2"
              aria-label={`${BRAND_NAME} home`}
            >
              <BrandLogo width={36} height={36} sizes="36px" eager />
              <span className="text-2xl font-semibold tracking-normal">
                {BRAND_NAME}
              </span>
            </Link>
            <p className="mt-1 text-sm text-[#43474c]">
              Sign in to your console
            </p>
          </header>

          {enabledOAuthStrategies.length ? (
            <div className="space-y-3">
              {enabledOAuthStrategies.map((strategy) => (
                <button
                  key={strategy}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleOAuth(strategy)}
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#c4c6cd] bg-white px-4 text-sm font-semibold text-[#0b1c30] transition-all hover:bg-[#eff4ff] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                >
                  <ProviderLogo strategy={strategy} />
                  Continue with {formatProviderName(strategy)}
                </button>
              ))}
            </div>
          ) : null}

          {enabledOAuthStrategies.length ? (
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#E2E8F0]" />
              </div>
              <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-[0.18em]">
                <span className="bg-white px-4 text-[#43474c]">or</span>
              </div>
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleEmailSignIn}>
            <label className="block space-y-2 text-sm font-semibold text-[#0b1c30]">
              <span>Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="h-11 w-full rounded-lg border border-[#c4c6cd] bg-[#eff4ff] px-4 text-sm font-normal text-[#0b1c30] outline-none transition-all placeholder:text-[#74777d]/70 focus:border-[#0051d5] focus:ring-2 focus:ring-[#0051d5]/20"
              />
            </label>

            <label className="block space-y-2 text-sm font-semibold text-[#0b1c30]">
              <span>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-[#c4c6cd] bg-[#eff4ff] px-4 text-sm font-normal text-[#0b1c30] outline-none transition-all placeholder:text-[#74777d]/70 focus:border-[#0051d5] focus:ring-2 focus:ring-[#0051d5]/20"
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isBusy}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[#00162a] text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {pendingStrategy === "password" ? "Signing in..." : "Continue"}
            </button>
          </form>

          <footer className="mt-8 border-t border-[#E2E8F0] pt-6 text-center">
            <p className="text-sm leading-5 text-[#43474c]">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-[#0051d5] transition-colors hover:text-[#003ea7] hover:underline hover:underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </footer>
        </div>

        <div className="mt-8 flex justify-center gap-6">
          <Link
            href={`${LEGAL_PATH}/privacy-policy`}
            className="text-[11px] font-medium text-[#43474c] underline decoration-[#E2E8F0] underline-offset-4 transition-colors hover:text-[#0051d5]"
          >
            Privacy Policy
          </Link>
          <Link
            href="mailto:support@shipyardhq.dev"
            className="text-[11px] font-medium text-[#43474c] underline decoration-[#E2E8F0] underline-offset-4 transition-colors hover:text-[#0051d5]"
          >
            Need help?
          </Link>
        </div>
      </section>
    </main>
  )
}
