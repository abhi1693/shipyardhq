import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { markNotificationRead } from "@/lib/server/notifications/service"

interface RouteParams {
  params: Promise<{ id?: string }>
}

export async function PATCH(_request: Request, context: RouteParams) {
  const { params } = context
  const resolvedParams = await params
  const rawNotificationId = resolvedParams.id?.trim()
  if (!rawNotificationId) {
    return NextResponse.json(
      { error: "Missing notification id" },
      { status: 400 },
    )
  }

  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const activeUser = await getActiveUserByClerkId(clerkUserId)
  if (!activeUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const updated = await markNotificationRead(activeUser.id, rawNotificationId)
    if (!updated) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[notifications] failed to mark notification read", {
      error,
      userId: activeUser.id,
      notificationId: rawNotificationId,
    })
    return NextResponse.json(
      { error: "Failed to mark notification read" },
      { status: 500 },
    )
  }
}
