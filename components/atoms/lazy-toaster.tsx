"use client"

import dynamic from "next/dynamic"
import type { ToasterProps } from "sonner"

const Toaster = dynamic(
  () => import("@/components/atoms/sonner").then((module) => module.Toaster),
  {
    ssr: false,
    loading: () => null,
  },
)

export function LazyToaster(props: ToasterProps) {
  return <Toaster {...props} />
}
