import PageContainer from "@/components/layout/page-container"

export default function OverviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageContainer>
      <div className="flex flex-col space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          Hi, Welcome back 👋
        </h2>
        {children}
      </div>
    </PageContainer>
  )
}
