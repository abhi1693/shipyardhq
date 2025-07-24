"use client"

import { NewsletterForm } from "@/components/molecules/NewsletterForm"
import { subscribeToNewsletter } from "@/actions/subscribe"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-1 items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* background tints & overlays omitted for brevity */}

        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-0">
          <h1 className="hero-heading mb-2">
            Unlock Hidden Growth for Your Micro‑SaaS
          </h1>
          <div className="mx-auto mb-8 h-1 w-20 bg-[var(--accent)] rounded-full" />

          <p className="text-lg text-[var(--foreground)]/90 mb-12">
            We’re building a game‑changing toolkit to streamline your workflow
            and boost revenue. Join now to be among the first to get exclusive
            access.
          </p>

          <div className="subscribe-card max-w-md mx-auto">
            <NewsletterForm
              action={subscribeToNewsletter}
              emailPlaceholder="Your best email"
              submitLabel="Subscribe →"
              className="gap-4"
              buttonClass="w-auto"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
