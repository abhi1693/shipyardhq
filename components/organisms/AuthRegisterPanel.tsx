"use client"

import Link from "next/link"
import { useClerk, useSignUp } from "@clerk/nextjs"
import type { OAuthStrategy } from "@clerk/nextjs/types"
import { IconBrandGithub, IconBrandX } from "@tabler/icons-react"
import type { SubmitEvent } from "react"
import { useState } from "react"

import { BrandLogo } from "@/components/atoms/brand-logo"
import { BRAND_NAME } from "@/lib/brand"
import { HOME_PATH, LEGAL_PATH, MEMBER_BASE_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

interface AuthRegisterPanelProps {
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
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.01.69-2.28 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.14c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.12H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.88l3.66-2.74z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.12l3.66 2.84c.87-2.6 3.3-4.53 6.14-4.53z"
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

  if (provider === "github") {
    return <IconBrandGithub className="h-5 w-5" aria-hidden />
  }

  if (provider === "x" || provider === "twitter") {
    return <IconBrandX className="h-5 w-5" aria-hidden />
  }

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#eff4ff] text-[11px] font-bold uppercase text-[#0051d5]">
      {provider.charAt(0)}
    </span>
  )
}

export default function AuthRegisterPanel({
  redirectUrl,
}: AuthRegisterPanelProps) {
  const finalRedirectUrl = redirectUrl ?? MEMBER_BASE_PATH
  const clerk = useClerk() as ClerkWithConnectionSettings
  const { signUp } = useSignUp()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [pendingStrategy, setPendingStrategy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const enabledOAuthStrategies =
    clerk.__internal_environment?.userSettings?.socialProviderStrategies ?? []
  const isBusy = pendingStrategy !== null

  async function completeSignUp() {
    const { error: finalizeError } = await signUp.finalize({
      navigate: ({ decorateUrl }) => {
        window.location.href = decorateUrl(finalRedirectUrl)
      },
    })

    if (finalizeError) {
      throw finalizeError
    }
  }

  async function handleOAuth(strategy: OAuthStrategy) {
    setPendingStrategy(strategy)
    setError(null)

    try {
      const { error: authError } = await signUp.sso({
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

  async function handleRegisterSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    setPendingStrategy("register")
    setError(null)

    try {
      const { error: passwordError } = await signUp.password({
        emailAddress: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      })

      if (passwordError) {
        throw passwordError
      }

      if (signUp.status === "complete") {
        await completeSignUp()
        return
      }

      if (signUp.unverifiedFields.includes("email_address")) {
        const { error: verificationError } =
          await signUp.verifications.sendEmailCode()

        if (verificationError) {
          throw verificationError
        }

        setIsVerifyingEmail(true)
        return
      }

      setError("Registration needs additional information before continuing.")
    } catch (authError) {
      setError(getErrorMessage(authError, "Unable to create account"))
    } finally {
      setPendingStrategy(null)
    }
  }

  async function handleVerificationSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    setPendingStrategy("verify")
    setError(null)

    try {
      const { error: verificationError } =
        await signUp.verifications.verifyEmailCode({
          code: verificationCode.trim(),
        })

      if (verificationError) {
        throw verificationError
      }

      if (signUp.status === "complete") {
        await completeSignUp()
        return
      }

      setError("Verification is not complete yet.")
    } catch (authError) {
      setError(getErrorMessage(authError, "Unable to verify email address"))
    } finally {
      setPendingStrategy(null)
    }
  }

  async function handleResendCode() {
    setPendingStrategy("resend")
    setError(null)

    try {
      const { error: verificationError } =
        await signUp.verifications.sendEmailCode()

      if (verificationError) {
        throw verificationError
      }
    } catch (authError) {
      setError(getErrorMessage(authError, "Unable to send a new code"))
    } finally {
      setPendingStrategy(null)
    }
  }

  return (
    <main
      className={cn(
        "relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f9ff] px-4 py-8 font-sans text-[#0b1c30] md:px-6",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(90deg,rgba(0,81,213,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(0,81,213,0.055)_1px,transparent_1px)] before:bg-[size:56px_56px]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(248,249,255,0.62))]",
      )}
    >
      <section className="relative z-10 w-full max-w-[480px]">
        <header className="mb-6 text-center">
          <Link
            href={HOME_PATH}
            className="inline-flex items-center justify-center gap-2 text-[#0b1c30] transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/40 focus-visible:ring-offset-2"
            aria-label={`${BRAND_NAME} home`}
          >
            <BrandLogo width={32} height={32} sizes="32px" eager />
            <span className="text-[32px] font-bold leading-10 tracking-normal">
              {BRAND_NAME}
            </span>
          </Link>
          <p className="mt-1 text-base leading-6 text-[#43474c]">
            The engine room for indie product success.
          </p>
        </header>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_12px_rgba(15,23,42,0.08)] md:p-10">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-normal text-[#0b1c30]">
              {isVerifyingEmail ? "Verify your email" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm leading-5 text-[#43474c]">
              {isVerifyingEmail
                ? `Enter the code sent to ${email.trim()}.`
                : "Join builders launching today."}
            </p>
          </div>

          {!isVerifyingEmail && enabledOAuthStrategies.length ? (
            <div className="space-y-3">
              {enabledOAuthStrategies.map((strategy) => (
                <button
                  key={strategy}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleOAuth(strategy)}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#0b1c30] transition-colors hover:bg-[#eff4ff] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                >
                  <ProviderLogo strategy={strategy} />
                  Continue with {formatProviderName(strategy)}
                </button>
              ))}
            </div>
          ) : null}

          {!isVerifyingEmail && enabledOAuthStrategies.length ? (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#E2E8F0]" />
              </div>
              <div className="relative flex justify-center text-[11px] font-medium uppercase">
                <span className="bg-white px-4 text-[#74777d]">
                  Or use email
                </span>
              </div>
            </div>
          ) : null}

          {isVerifyingEmail ? (
            <form className="space-y-5" onSubmit={handleVerificationSubmit}>
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#43474c]">
                <span>Verification code</span>
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  inputMode="numeric"
                  required
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#eff4ff] px-3 text-center text-lg font-semibold tracking-[0.4em] text-[#0b1c30] outline-none transition-all placeholder:text-[#74777d]/60 focus:border-[#0051d5] focus:ring-1 focus:ring-[#0051d5]"
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
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#0b1c30] text-sm font-semibold text-white transition-all hover:bg-[#213145] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                {pendingStrategy === "verify"
                  ? "Verifying..."
                  : "Complete Registration"}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleResendCode}
                className="w-full text-center text-sm font-semibold text-[#0051d5] transition-colors hover:text-[#003ea7] disabled:pointer-events-none disabled:opacity-60"
              >
                {pendingStrategy === "resend" ? "Sending..." : "Resend code"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#43474c]">
                  <span>First name</span>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#eff4ff] px-3 text-sm font-normal normal-case tracking-normal text-[#0b1c30] outline-none transition-all placeholder:text-[#74777d]/60 focus:border-[#0051d5] focus:ring-1 focus:ring-[#0051d5]"
                    placeholder="John"
                  />
                </label>
                <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#43474c]">
                  <span>Last name</span>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#eff4ff] px-3 text-sm font-normal normal-case tracking-normal text-[#0b1c30] outline-none transition-all placeholder:text-[#74777d]/60 focus:border-[#0051d5] focus:ring-1 focus:ring-[#0051d5]"
                    placeholder="Doe"
                  />
                </label>
              </div>

              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#43474c]">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#eff4ff] px-3 text-sm font-normal normal-case tracking-normal text-[#0b1c30] outline-none transition-all placeholder:text-[#74777d]/60 focus:border-[#0051d5] focus:ring-1 focus:ring-[#0051d5]"
                  placeholder="john@example.com"
                />
              </label>

              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#43474c]">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#eff4ff] px-3 text-sm font-normal normal-case tracking-normal text-[#0b1c30] outline-none transition-all placeholder:text-[#74777d]/60 focus:border-[#0051d5] focus:ring-1 focus:ring-[#0051d5]"
                  placeholder="••••••••"
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
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#0b1c30] text-sm font-semibold text-white transition-all hover:bg-[#213145] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                {pendingStrategy === "register"
                  ? "Creating account..."
                  : "Complete Registration"}
              </button>
            </form>
          )}

          <footer className="mt-6 border-t border-[#E2E8F0] pt-6 text-center">
            <p className="text-sm leading-5 text-[#43474c]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#0051d5] transition-colors hover:text-[#003ea7] hover:underline"
              >
                Log in
              </Link>
            </p>
          </footer>
        </div>

        <p className="mt-6 px-6 text-center text-[11px] font-medium leading-4 text-[#74777d]">
          By continuing, you agree to {BRAND_NAME}&apos;s{" "}
          <Link
            href={`${LEGAL_PATH}/terms`}
            className="underline underline-offset-2 hover:text-[#0b1c30]"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href={`${LEGAL_PATH}/privacy-policy`}
            className="underline underline-offset-2 hover:text-[#0b1c30]"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
