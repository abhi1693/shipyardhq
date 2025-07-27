import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - ShipYardHQ",
  description: "Review the terms and conditions for using ShipYardHQ.",
}

export default function TermsOfServicePage() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16 space-y-6">
      <h1 className="text-4xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: Aug 1, 2025</p>

      <p>
        Welcome to ShipYardHQ! By accessing or using our website,
        https://shipyardhq.dev, you agree to be bound by these Terms of Service.
        Please read them carefully.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Acceptance</h2>
      <p>
        By using ShipYardHQ, you agree to these terms. If you don&#39;t agree,
        please don&#39;t use our service.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Our Service</h2>
      <p>
        ShipYardHQ is a platform for startups to showcase their products and
        connect with potential customers and investors.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Your Account</h2>
      <p>
        You&#39;re responsible for your account security and all activities
        under your account. Provide accurate information and keep your login
        credentials safe.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Content Rules</h2>
      <p>When using our platform, you agree not to:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Post illegal, harmful, or offensive content</li>
        <li>Violate others&#39; intellectual property rights</li>
        <li>Share false or misleading information</li>
        <li>Spam or misuse the platform</li>
      </ul>
      <p className="mt-2">
        You own your content, but by posting it, you give us permission to
        display and distribute it on our platform.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Intellectual Property</h2>
      <p>
        Our platform, design, and features belong to us. You can use our service
        but can&#39;t copy or misuse our intellectual property.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Payments</h2>
      <p>
        Some features may require payment. All fees are clearly displayed before
        purchase. Payments are generally non-refundable unless required by law.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Disclaimers</h2>
      <p>
        Our service is provided &#34;as is&#34; without warranties. We don&#39;t
        guarantee the platform will always be available or error-free.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Limitation of Liability</h2>
      <p>
        We&#39;re not liable for any indirect damages or losses from using our
        service. Our total liability is limited to the amount you&#39;ve paid
        us.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Changes</h2>
      <p>
        We may update these terms occasionally. We&#39;ll notify you of
        significant changes. Continued use means you accept the new terms.
      </p>

      <h2 className="text-2xl font-semibold mt-6">Contact Us</h2>
      <p>
        If you have questions about these terms of service, contact us at{" "}
        <a
          href="mailto:shipyardhq.dev@gmail.com"
          className="text-primary underline"
        >
          shipyardhq.dev@gmail.com
        </a>
      </p>

      <p className="mt-6">
        Thank you for reading our terms of service and using ShipYardHQ!
      </p>
    </section>
  )
}
