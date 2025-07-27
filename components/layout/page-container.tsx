import React from "react"
import { ScrollArea } from "@/components/atoms/scroll-area"

export default function PageContainer({
  children,
  scrollable = true,
}: {
  children: React.ReactNode
  scrollable?: boolean
}) {
  const content = (
    <div className="w-full px-4 md:px-6">
      <div className="mx-auto w-full">{children}</div>
    </div>
  )

  return scrollable ? (
    <ScrollArea className="h-[calc(100dvh-52px)]">{content}</ScrollArea>
  ) : (
    content
  )
}
