import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { buildPageMetadata } from "@/lib/metadata"
import { getRewardRuleById } from "@/actions/admin/rewards/actions"

import RuleForm from "../../form"

type PageParams = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { id } = await params
  const rule = await getRewardRuleById(id)
  return buildPageMetadata({
    title: rule ? `Edit ${rule.name}` : "Edit reward rule",
    section: "Admin",
  })
}

export default async function EditRewardRulePage({ params }: PageParams) {
  const { id } = await params
  const rule = await getRewardRuleById(id)
  if (!rule) {
    notFound()
  }

  return <RuleForm mode="edit" rule={rule} />
}
