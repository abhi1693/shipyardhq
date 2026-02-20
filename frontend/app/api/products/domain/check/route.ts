import { NextRequest, NextResponse } from "next/server"

import { checkDomainTxtAction } from "@/actions/admin/products/actions"

type CheckDomainBody = {
  websiteUrl?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CheckDomainBody
  const websiteUrl = body.websiteUrl?.trim()

  if (!websiteUrl) {
    return NextResponse.json({ error: "Missing website URL" }, { status: 400 })
  }

  const result = await checkDomainTxtAction(websiteUrl)
  return NextResponse.json(result)
}
