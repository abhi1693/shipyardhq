import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import {
  listNotificationsForUserCached,
} from "@/lib/server/notifications/service"

export async function GET(request: Request) {
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

  const url = new URL(request.url)
  const limitParam = url.searchParams.get("limit")
  const cursorParam = url.searchParams.get("cursor")
  const limit = limitParam ? Number(limitParam) : undefined

  try {
    const result = await listNotificationsForUserCached(
      activeUser.id,
      {
        limit: Number.isFinite(limit) ? limit : undefined,
        cursor: cursorParam,
      },
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error(
      "[notifications] failed to list notifications",
      { error, userId: activeUser.id },
    )
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 },
    )
  }
}
