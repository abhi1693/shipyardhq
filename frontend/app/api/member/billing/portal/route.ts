import { NextResponse } from "next/server"

import { createBillingPortalAction } from "@/actions/member/billing/portal"

export async function POST() {
  try {
    const result = await createBillingPortalAction(false)
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
