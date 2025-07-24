import { NewsletterForm } from "@/components/molecules/NewsletterForm"
import { subscribeToNewsletter } from "@/actions/subscribe"

export function SubscribeSection() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-white to-white">
      <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gradient-hero mb-6">
        Coming Soon
      </h2>
      <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed mb-6">
        We’re building something exciting for indie makers and micro‑SaaS
        founders.
        <br />
        Follow us and stay updated for launch.
      </p>
      <NewsletterForm
        action={subscribeToNewsletter}
        submitLabel="Join Waitlist"
      />
    </section>
  )
}
