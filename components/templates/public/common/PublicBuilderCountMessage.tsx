import { formatPublicBuilderCountMessage } from "@/lib/publicBuilderCount"
import { getPublicBuilderCount } from "@/lib/server/publicBuilderCount"

export async function PublicBuilderCountMessage() {
  const builderCount = await getPublicBuilderCount().catch(() => 0)

  return formatPublicBuilderCountMessage(builderCount)
}
