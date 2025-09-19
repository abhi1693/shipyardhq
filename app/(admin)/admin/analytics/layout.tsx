import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Analytics - ShipYardHQ",
  description: "Detailed analytics for ShipYardHQ operations.",
}

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="space-y-12">{children}</div>
}
