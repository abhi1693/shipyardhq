import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

import Providers from "@/components/layout/providers"

export default function SsoCallbackPage() {
  return (
    <Providers>
      <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-6 text-center text-sm text-[#43474c]">
        <div id="clerk-captcha" />
        <AuthenticateWithRedirectCallback />
      </main>
    </Providers>
  )
}
