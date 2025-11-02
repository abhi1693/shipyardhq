"use client"

import {
  ProductFeedList,
  type ProductFeedListProps,
} from "@/components/organisms/feed/ProductFeedList"

export type HomepageFeedClientProps = ProductFeedListProps

export function HomepageFeedClient(props: HomepageFeedClientProps) {
  return <ProductFeedList {...props} />
}

export default HomepageFeedClient
