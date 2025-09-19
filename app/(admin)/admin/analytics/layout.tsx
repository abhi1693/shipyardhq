import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata({
  section: "Admin Analytics",
  description: "Detailed analytics for ShipYardHQ operations.",
})

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="space-y-12">{children}</div>
}
