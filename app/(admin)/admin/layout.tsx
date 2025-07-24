import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import AppSidebar from "@/components/layout/app-sidebar"
import Header from "@/components/layout/header"

export const metadata: Metadata = {
  title: "Admin - ShipYardHQ",
  description: "Admin dashboard for managing ShipYard.",
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
