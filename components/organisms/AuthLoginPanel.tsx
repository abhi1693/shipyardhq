"use client"

import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

import { BrandLogo } from "@/components/atoms/brand-logo"
import { BRAND_NAME } from "@/lib/brand"
import { HOME_PATH, LEGAL_PATH, MEMBER_BASE_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

export default function AuthLoginPanel({
  redirectUrl,
}: {
  redirectUrl?: string
}) {
  return (
    <main
      className={cn(
        "relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f9ff] p-6 font-sans text-[#0b1c30]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle,#E2E8F0_1px,transparent_1px)] before:bg-[size:32px_32px] before:opacity-40",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_50%,rgba(248,250,255,0.92)_0%,rgba(239,244,255,0.54)_100%)]",
      )}
    >
      <section className="relative z-10 w-full max-w-[440px]">
        <div className="flex flex-col items-center">
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
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
            forceRedirectUrl={redirectUrl ?? MEMBER_BASE_PATH}
          />
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
