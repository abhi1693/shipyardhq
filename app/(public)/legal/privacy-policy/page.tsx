import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "Learn how ShipYardHQ collects, uses, and protects your personal information.",
})

export default function PrivacyPolicyPage() {
  return (
    <PublicContainer max="3xl" paddingY="py-16">
      <PageHeader
        title="Privacy Policy"
        subtitle="Learn how ShipYardHQ collects, uses, and protects your personal information."
      />
      <div className="space-y-6 mt-6">
        <p className="text-muted-foreground">Last updated: Aug 1, 2025</p>

        <p>
          Welcome to ShipYardHQ! This Privacy Policy explains how we collect,
          use, and protect your personal information when you use our website
          and services. By using our website, you agree to the collection and
          use of information in accordance with this policy.
        </p>

        <h2 className="text-2xl font-semibold mt-6">
          What Information We Collect
        </h2>
        <p>We collect information you provide directly to us, such as:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Name and email address when you create an account</li>
          <li>Company information for product listings</li>
          <li>Communications you send to us</li>
        </ul>
        <p className="mt-4">We also automatically collect:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Browser and device information</li>
          <li>Usage data and website interactions</li>
          <li>Cookies for website functionality</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">
          How We Use Your Information
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Provide and improve our services</li>
          <li>Communicate with you about your account</li>
          <li>Send you updates and marketing (with your consent)</li>
          <li>Ensure platform security and prevent fraud</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share your
          information only:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>With service providers who help us operate our platform</li>
          <li>When required by law or to protect our rights</li>
          <li>With your consent for specific purposes</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">Your Rights</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Access and update your personal information</li>
          <li>Delete your account and personal data</li>
          <li>Opt out of marketing communications</li>
          <li>Control cookie preferences in your browser</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">Data Security</h2>
        <p>
          We implement security measures to protect your information, but no
          method of transmission over the internet is 100% secure.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Changes</h2>
        <p>
          We may update this policy from time to time. We&#39;ll notify you of
          any material changes by posting the updated policy here. Major changes
          will also be announced by email.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Contact Us</h2>
        <p>
          If you have questions about this privacy policy, contact us at{" "}
          <a
            href="mailto:shipyardhq.dev@gmail.com"
            className="text-primary underline"
          >
            shipyardhq.dev@gmail.com
          </a>
        </p>

        <p className="mt-6">
          Thank you for reading our privacy policy and using ShipYardHQ!
        </p>
      </div>
    </PublicContainer>
  )
}
