import { NextResponse } from "next/server"

import {
  disableEmailDelivery,
  enableEmailDelivery,
  isEmailDeliveryDisabled,
} from "@/lib/email/resend"

function isProduction() {
  return process.env.NODE_ENV === "production"
}

function notFound() {
  return new NextResponse(null, { status: 404 })
}

export async function GET() {
  if (isProduction()) {
    return notFound()
  }

  return NextResponse.json({ disabled: isEmailDeliveryDisabled() })
}

export async function POST() {
  if (isProduction()) {
    return notFound()
  }

  disableEmailDelivery()
  return NextResponse.json({ disabled: isEmailDeliveryDisabled() })
}

export async function DELETE() {
  if (isProduction()) {
    return notFound()
  }

  enableEmailDelivery()
  return NextResponse.json({ disabled: isEmailDeliveryDisabled() })
}
