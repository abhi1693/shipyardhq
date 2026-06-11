import React from "react"
import { ScrollArea } from "@/components/atoms/scroll-area"

export default function PageContainer({
  children,
  scrollable = false,
}: {
  children: React.ReactNode
  scrollable?: boolean
}) {
  const content = (
    <div className="w-full p-4 md:p-6">
      <div className="w-full">{children}</div>
    </div>
  )

  return scrollable ? (
    <ScrollArea className="h-[calc(100dvh-52px)]">{content}</ScrollArea>
  ) : (
    content
  )
}
