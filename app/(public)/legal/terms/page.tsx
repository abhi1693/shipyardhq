import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Review the terms and conditions for using ShipYardHQ.",
})

export default function TermsOfServicePage() {
  return (
    <PublicContainer max="3xl" paddingY="py-16">
      <PageHeader
        title="Terms of Service"
        subtitle="Review the terms and conditions for using ShipYardHQ."
      />

      <div className="space-y-6 mt-6">
        <p className="text-muted-foreground">Last updated: Sep 16, 2025</p>

        <p>
          ShipYardHQ is owned and operated by Abhimanyu Saharan. These Terms of
          Service (the &#34;Terms&#34;) govern your use of our website and
          services at https://shipyardhq.dev (the &#34;Service&#34;). By
          accessing or using the Service, you agree to be bound by these Terms
          and our Privacy Policy. If you do not agree, do not use the Service.
        </p>

        <h2 className="text-2xl font-semibold mt-6">
          Eligibility and Accounts
        </h2>
        <p>
          You must be at least 18 years old (or the age of majority in your
          jurisdiction) and have the authority to bind any organization you
          represent. You are responsible for maintaining accurate account
          information, safeguarding your credentials, and complying with
          applicable laws when using the Service.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Acceptable Use</h2>
        <p>
          You may not use the Service in any manner that violates these Terms or
          applicable law. Without limiting the foregoing, you will not:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Post or promote pornography, sexually explicit content, or escort
            services
          </li>
          <li>
            Advertise alcohol, tobacco, or cannabis in violation of any law or
            regulation
          </li>
          <li>
            Operate or advertise gambling, betting, or fantasy-sports services
          </li>
          <li>Engage in illegal, harmful, deceptive, or abusive conduct</li>
          <li>Infringe any intellectual property or proprietary rights</li>
          <li>Attempt to gain unauthorized access to the Service</li>
        </ul>
        <p className="mt-2">
          We reserve the right to suspend or terminate accounts, remove content,
          or refuse service to anyone for any abusive or unlawful use of the
          Service.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Your Content</h2>
        <p>
          You retain ownership of the content you submit to the Service. By
          posting or submitting content, you grant ShipYardHQ a worldwide,
          non-exclusive, royalty-free, sublicensable, and transferable license
          to host, store, reproduce, modify for formatting, publicly display,
          distribute, and promote the content in connection with the Service.
          You represent that you have all rights necessary to grant this license
          and that your content does not violate any laws or third-party rights.
        </p>
        <p className="mt-2">
          You agree to indemnify and hold harmless Abhimanyu Saharan and
          ShipYardHQ from any claims, damages, liabilities, costs, and expenses
          (including reasonable legal fees) arising out of or relating to your
          content, your use of the Service, or your violation of these Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6">
          Paid Features and Payments
        </h2>
        <p>
          Certain features, including the Adaptive Currency offerings, require
          payment of fees (collectively, the &#34;Paid Features&#34;). Fees are
          stated at the point of purchase and are processed through Stripe
          Connect on behalf of ShipYardHQ. Charges are typically taken in the
          currency presented at checkout; Stripe may convert payments when
          required.
        </p>
        <p className="mt-2">
          All fees must be paid in full when due. All sales are final and
          non-refundable, and we do not offer free trials. You are responsible
          for any taxes, levies, or duties associated with your purchases, other
          than taxes on our income. We may suspend or terminate access to Paid
          Features for non-payment, disputed charges, chargebacks, or suspected
          fraud.
        </p>

        <h2 className="text-2xl font-semibold mt-6">
          Service Changes and Availability
        </h2>
        <p>
          We may modify, discontinue, or suspend any part of the Service at any
          time, with or without notice. We are not liable for any loss you incur
          due to such changes, provided we refund any fees paid for unused Paid
          Features if required by law.
        </p>

        <h2 className="text-2xl font-semibold mt-6">
          Disclaimer of Warranties
        </h2>
        <p>
          THE SERVICE IS PROVIDED ON AN &#34;AS IS&#34; AND &#34;AS
          AVAILABLE&#34; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS
          OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT
          WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ERROR-FREE, OR
          FREE OF HARMFUL COMPONENTS, NOR DO WE ENDORSE OR GUARANTEE ANY USER
          CONTENT OR THIRD-PARTY SERVICES OR LINKS ACCESSED THROUGH THE SERVICE.
          YOU USE THE SERVICE AT YOUR OWN RISK.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHIPYARDHQ AND ABHIMANYU
          SAHARAN WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, COVER, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
          REVENUE, DATA, OR GOODWILL ARISING OUT OF OR RELATED TO YOUR USE OF OR
          INABILITY TO USE THE SERVICE. OUR TOTAL LIABILITY FOR ALL CLAIMS IN
          CONNECTION WITH THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID TO US
          FOR THE SERVICE IN THE 12 MONTHS BEFORE THE CLAIM AROSE.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will provide notice, such as by email or by updating the
          date at the top of this page. Your continued use of the Service after
          the revised Terms go into effect constitutes acceptance of the
          changes.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Contact Us</h2>
        <p>
          If you have questions about these Terms, contact us at{" "}
          <a
            href="mailto:shipyardhq.dev@gmail.com"
            className="text-primary underline"
          >
            shipyardhq.dev@gmail.com
          </a>
          .
        </p>
      </div>
    </PublicContainer>
  )
}
