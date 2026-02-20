import { NextResponse } from "next/server"

import { createBillingPortalLinkServer } from "@/lib/server/member-billing-portal"

export async function POST() {
  try {
    const result = await createBillingPortalLinkServer(false)
    const hasError =
      result && typeof result === "object" && "error" in result && result.error

    return NextResponse.json(result, {
      status: hasError ? 400 : 200,
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to open billing portal" },
      { status: 500 },
    )
  }
}
