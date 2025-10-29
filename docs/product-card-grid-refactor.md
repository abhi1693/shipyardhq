# Product Card & Grid Refactor Notes

## What Changed
- Consolidated card data mapping through `lib/products/card-item.ts` and replaced per-page mappers with the shared helper.
- Removed the legacy compact card/grid components and updated skeletons to reuse the feed card skeleton.
- Standardized static pagination with `createStaticProductPager`, simplifying category and directory feeds.
- Introduced `actions/public/products/feedPage.ts` so browse, tag, and alternative infinite scroll all hit a single server action.

## Why It Changed
- Repeated vote/category/badge mapping across pages made maintenance error-prone; a single mapper prevents diverging logic.
- Dual card/grid implementations caused inconsistent UI and extra code; eliminating the compact variant keeps the UX aligned with the homepage design.
- Each component was rolling its own chunking for static pagination. Centralizing the logic reduced boilerplate and ensured consistent behavior.
- Multiple near-identical `loadMore` server wrappers duplicated work; routing through one feed action reduces query overhead and eases future feature development.

## Next Steps
1. Consider extracting shared Prisma select fragments for feeds so future server actions can be composed without repeating field lists.
2. Expand `actions/public/products/feedPage.ts` with additional sources (e.g., leaderboard, rewards) to further consolidate product listings.
3. Add integration tests or visual regression coverage around `ProductGrid` to lock in the single-column feed layout across consumers.
