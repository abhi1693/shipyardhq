import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getBadges } from "@/actions/admin/badges/actions"

export const metadata: Metadata = {
  title: "Badges",
  description: "Manage badges in the admin panel",
}

export default async function BadgePage() {
  const badges = await getBadges()

  return (
    <ListPageWrapper title="Badges" addLink="/admin/products/badges/add">
      <EntityList columns={columns} data={badges} />
    </ListPageWrapper>
  )
}
