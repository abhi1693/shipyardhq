import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import AdminSidebar from "@/components/layout/admin-sidebar"
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
      <AdminSidebar />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
