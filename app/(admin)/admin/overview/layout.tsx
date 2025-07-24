import PageContainer from "@/components/layout/page-container"
import { Badge } from "@/components/atoms/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/atoms/card"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
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
