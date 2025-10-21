import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { markAllNotificationsRead } from "@/lib/server/notifications/service"

export async function PATCH() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  const activeUser = await getActiveUserByClerkId(
    clerkUserId,
  )
  if (!activeUser) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    )
  }

  try {
    const updatedCount = await markAllNotificationsRead(
      activeUser.id,
    )
    return NextResponse.json(
      { success: true, count: updatedCount },
      { status: 200 },
    )
  } catch (error) {
    console.error(
      "[notifications] failed to mark all notifications read",
      { error, userId: activeUser.id },
    )
    return NextResponse.json(
      { error: "Failed to mark notifications read" },
      { status: 500 },
    )
  }
}
