import PageContainer from "@/components/layout/page-container"
import React from "react"

export default function OverviewLayout() {
  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Hi, Welcome back 👋
          </h2>
        </div>
      </div>
    </PageContainer>
  )
}
