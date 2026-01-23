"use server"

import {
  getKeywordTagDirectoryPage,
  type TagDirectoryPageParams,
  type TagDirectoryPageResult,
} from "@/actions/public/tags/actions"

export async function getTagDirectoryPage(
  params: TagDirectoryPageParams,
): Promise<TagDirectoryPageResult> {
  return getKeywordTagDirectoryPage(params)
}
