"use client"

import {
  ProductFeedList,
  type ProductFeedListProps,
} from "@/components/organisms/feed/ProductFeedList"

export interface HomepageFeedClientProps
  extends Omit<ProductFeedListProps, "showStickyBannerRegion"> {}

export function HomepageFeedClient(props: HomepageFeedClientProps) {
  return <ProductFeedList {...props} />
}

export default HomepageFeedClient
