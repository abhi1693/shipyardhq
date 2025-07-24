'use client'

import { NewsletterForm } from '@/components/molecules/NewsletterForm'
import { subscribeToNewsletter } from '@/actions/subscribe'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-1 items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* Background tints */}
        <div className="hero-gradient-bg" />
        <div className="hero-overlay" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="hero-heading">
            Unlock Hidden Growth for Your Micro‑SaaS
          </h1>
          <p className="text-lg text-[var(--foreground)]/90 mb-6">
            We’re building a game‑changing toolkit to streamline your workflow and boost revenue.
            Join now to be among the first to get exclusive access.
          </p>
          <div className="mx-auto max-w-md">
            <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-4 sm:p-6">
              <NewsletterForm
                action={subscribeToNewsletter}
                emailPlaceholder="Your best email"
                submitLabel="Subscribe →"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
