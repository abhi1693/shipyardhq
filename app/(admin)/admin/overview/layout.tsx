import PageContainer from "@/components/layout/page-container"
import { currentUser } from "@clerk/nextjs/server"

export default async function OverviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  return (
    <PageContainer>
      <div className="flex flex-col space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          Hi {user?.firstName}, Welcome back 👋
        </h2>
        {children}
      </div>
    </PageContainer>
  )
}
