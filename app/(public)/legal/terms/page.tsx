import StickyBannerSuppressor from "@/components/layout/StickyBannerSuppressor"
import { PageHeader } from "@/components/molecules/PageHeader"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Review the terms and conditions for using ShipYardHQ.",
})

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen py-16">
      <StickyBannerSuppressor />
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <PageHeader
          title="Terms of Service"
          subtitle="Review the terms and conditions for using ShipYardHQ."
        />
        <div className="mt-6 space-y-6">
          <p className="text-muted-foreground">Last updated: Oct 9, 2025</p>

          <p>
            These Terms of Service (the &quot;Terms&quot;) apply to your access
            to and use of the ShipYardHQ website, applications, APIs, and
            related services (collectively, the &quot;Service&quot;). By
            creating an account or using the Service you agree to these Terms
            and our Privacy Policy. If you are using the Service on behalf of an
            organization, you represent that you have authority to bind that
            organization; in that case, &quot;you&quot; and &quot;your&quot;
            refer to both the organization and each individual who accesses the
            Service on its behalf.
          </p>

          <h2 className="text-2xl font-semibold mt-6">
            1. Eligibility and Accounts
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              You must be at least 18 years old (or the age of majority where
              you live) to use the Service. Registration requires accurate
              information and an active email address routed through our
              identity provider, Clerk.
            </li>
            <li>
              You are responsible for all activity under your account,
              safeguarding credentials, and ensuring that teammates you invite
              comply with these Terms.
            </li>
            <li>
              We may suspend or terminate accounts, reclaim usernames, or
              disable access if we detect misuse, inactivity, or violations of
              these Terms.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">
            2. The ShipYardHQ Service
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              ShipYardHQ provides a product discovery marketplace, maker
              workspaces, analytics dashboards, rewards economies, and related
              tools that help you launch and promote products.
            </li>
            <li>
              Features may include product submissions, organization workspaces,
              leaderboard placements, automated insights, AI-assisted content,
              out-of-band notifications, and third-party integrations (such as
              email or social sharing).
            </li>
            <li>
              We may update or discontinue any feature, and we reserve the right
              to impose limits or require eligibility (for example, paid plans
              for advanced analytics or placements).
            </li>
            <li>
              Analytics and insight features rely on aggregated data and may be
              delayed or estimated. They are provided for informational purposes
              only and should not be relied upon for legal or financial
              decision-making.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">
            3. Plans, Payments, and Taxes
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Certain features (including featured placements, advanced
              analytics, and organization access) require payment. Prices,
              currency, and billing cadence are shown at checkout and may change
              from time to time.
            </li>
            <li>
              Payments are processed by Dodo Payments on our behalf. By
              submitting a purchase you authorize Dodo to charge the payment
              method you provide and to share transaction metadata with us so we
              can provision features.
            </li>
            <li>
              Fees are due immediately and, unless stated otherwise, are
              non-refundable. We may issue refunds only where required by law.
            </li>
            <li>
              You are responsible for any taxes, duties, or levies associated
              with your purchase, except for taxes on ShipYardHQ&apos;s income.
            </li>
            <li>
              We may suspend or revoke access to paid features for non-payment,
              disputed charges, or suspected fraud.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">4. Rewards and Perks</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              ShipYardHQ operates a rewards program that lets members earn and
              redeem points for perks such as placements, feature unlocks, or
              limited-time benefits.
            </li>
            <li>
              Rewards have no cash value, are not transferable, and may expire
              or be revoked at our discretion if we detect misuse or
              ineligibility.
            </li>
            <li>
              We may change redemption rules, costs, or availability without
              notice. Some redemptions require an associated product or
              schedule; failure to meet prerequisites can forfeit the reward.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">
            5. User Content and License
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              You retain ownership of content you submit, including product
              listings, media assets, reviews, feedback, and organization data.
            </li>
            <li>
              You grant ShipYardHQ a worldwide, non-exclusive, royalty-free,
              sublicensable, transferable license to host, reproduce, modify for
              formatting, distribute, publicly display, and otherwise use that
              content to operate and promote the Service.
            </li>
            <li>
              You represent that your submissions are accurate, lawful, and do
              not infringe third-party rights. You are responsible for securing
              permissions (for example, from teammates or licensors) before
              sharing content.
            </li>
            <li>
              We may remove or decline to publish content that violates these
              Terms or our policies.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">6. Acceptable Use</h2>
          <p>
            You may not use the Service in any manner that violates law,
            interferes with others, or harms our community. Prohibited conduct
            includes:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Posting or promoting unlawful, deceptive, defamatory, obscene,
              hateful, or discriminatory content.
            </li>
            <li>
              Advertising or facilitating regulated or high-risk activities
              (including gambling, escort services, weapons sales, or illicit
              substances) without our prior written consent.
            </li>
            <li>
              Attempting to bypass security, scrape or harvest data without
              permission, or reverse engineer protected portions of the Service.
            </li>
            <li>
              Submitting malware, exploits, or content that overloads or
              interferes with the Service.
            </li>
            <li>
              Misrepresenting your affiliation, fraudulently manipulating
              rankings, or engaging in reward abuse (for example, falsifying
              traffic events or reviews).
            </li>
          </ul>
          <p className="mt-2">
            We reserve the right to investigate and take appropriate action,
            including removing content, suspending accounts, revoking rewards,
            or contacting authorities.
          </p>

          <h2 className="text-2xl font-semibold mt-6">
            7. AI and Automation Features
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Certain features use third-party AI models (currently OpenAI) to
              draft product copy, analytics narratives, outreach messaging, or
              similar content. Prompts may include product metadata or
              aggregated usage statistics.
            </li>
            <li>
              AI outputs can be inaccurate or incomplete. You are solely
              responsible for reviewing, editing, and ensuring any AI-generated
              content you publish complies with law and these Terms.
            </li>
            <li>
              You may not use ShipYardHQ&apos;s automation to violate
              third-party terms (for example, social platform rules or anti-spam
              laws).
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">
            8. Intellectual Property
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              ShipYardHQ, our logos, trademarks, code, and original content are
              owned by us or our licensors and are protected by intellectual
              property laws. Except for the rights expressly granted to you
              herein, we reserve all rights.
            </li>
            <li>
              You may not copy, modify, distribute, sell, or lease any part of
              the Service without our prior written consent.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">
            9. Feedback and Beta Features
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              If you provide feedback or ideas, you grant us a perpetual,
              worldwide license to use that feedback without compensation.
            </li>
            <li>
              Beta or pre-release features may be labeled as such and are
              provided &quot;as is&quot; for evaluation. We may discontinue them
              at any time and make no commitments about launch timing or
              support.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">
            10. Third-Party Services
          </h2>
          <p>
            The Service may link to third-party websites or integrate with
            vendors such as Clerk, Dodo Payments, Resend, OpenAI, or social
            networks. Your use of those services is subject to their own terms
            and privacy policies. We do not control and are not responsible for
            third-party services.
          </p>

          <h2 className="text-2xl font-semibold mt-6">
            11. Termination and Suspension
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              You may close your account at any time. Some content may remain
              visible if it has been shared with others or is needed for legal
              or operational reasons.
            </li>
            <li>
              We may suspend or terminate access immediately for violation of
              these Terms, suspected fraud, non-payment, or to protect the
              Service or other users. We will make reasonable efforts to notify
              you unless prohibited by law or security concerns.
            </li>
            <li>
              Upon termination, sections that by nature should survive
              (including payment obligations, content licenses, disclaimers,
              limitations of liability, and indemnities) will remain in effect.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">
            12. Disclaimer of Warranties
          </h2>
          <p>
            THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
            AVAILABLE&quot; BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, WE
            DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
            NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF
            DEALING OR USAGE OF TRADE. WE DO NOT WARRANT THAT THE SERVICE WILL
            BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT CONTENT WILL BE
            ACCURATE OR RELIABLE.
          </p>

          <h2 className="text-2xl font-semibold mt-6">
            13. Limitation of Liability
          </h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHIPYARDHQ, ITS AFFILIATES,
            AND THEIR RESPECTIVE DIRECTORS, OFFICERS, EMPLOYEES, AND AGENTS WILL
            NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE,
            DATA, GOODWILL, OR BUSINESS INTERRUPTION. OUR AGGREGATE LIABILITY
            FOR ALL CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER
            OF (A) THE AMOUNT YOU PAID US FOR ACCESS TO THE SERVICE IN THE 12
            MONTHS BEFORE THE EVENT GIVING RISE TO LIABILITY OR (B) USD $100.
            SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS, SO SOME OF THE
            ABOVE MAY NOT APPLY TO YOU.
          </p>

          <h2 className="text-2xl font-semibold mt-6">14. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless ShipYardHQ and its
            affiliates, officers, directors, employees, and agents from and
            against any claims, liabilities, damages, losses, and expenses,
            including reasonable legal fees, arising from or relating to your
            content, your use of the Service, or your violation of these Terms
            or applicable law.
          </p>

          <h2 className="text-2xl font-semibold mt-6">
            15. Governing Law and Dispute Resolution
          </h2>
          <p>
            These Terms are governed by the laws of the State of Delaware,
            United States, without regard to conflict of law rules. You agree to
            the exclusive jurisdiction and venue of the state and federal courts
            located in Delaware for any dispute that is not subject to mandatory
            arbitration or cannot be resolved informally.
          </p>

          <h2 className="text-2xl font-semibold mt-6">
            16. Changes to These Terms
          </h2>
          <p>
            We may modify these Terms at any time. If we make material changes,
            we will provide notice (for example, by email or by updating the
            date at the top of this page). Your continued use of the Service
            after the changes become effective constitutes acceptance of the
            revised Terms.
          </p>

          <h2 className="text-2xl font-semibold mt-6">17. Contact</h2>
          <p>
            Questions about these Terms? Email{" "}
            <a
              href="mailto:support@shipyardhq.dev"
              className="text-primary underline"
            >
              support@shipyardhq.dev
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
