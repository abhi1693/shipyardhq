# Shipyard Homepage Blueprint

## 1. Foundations
- **Layout width**: full-bleed white background (`bg-white`) with constrained content width (`max-w-[1440px]`) and consistent page padding (`px-12` desktop, `px-8` large tablet, `px-6` tablet, `px-4` mobile).
- **Typography**: continue using the existing sans stack. Establish a headline scale inspired by Product Hunt and AI Directories:
  - Display: `text-5xl font-semibold tracking-tight`
  - Section titles: `text-3xl font-semibold`
  - Card titles: `text-lg font-semibold`
  - Body: `text-base text-[#3B4256]`
- **Color direction**: refreshed palette on a white canvas—
  - Primary text & buttons: `#1C2333`
  - Neutral surfaces: `#FFFFFF`
  - Subtle hover wash: `#F6F5F9`
  - Sponsored tint: `#F3F0FF`
  - Accent gradient for micro elements: `from-[#7F5AF0] to-[#2CB1BC]`
  Avoid borders; rely on soft shadows and background shifts.
- **Spacing**: adopt an 8 px baseline grid; cards use 24–28 px internal padding; vertical sections separated by 80 px on desktop, 56 px on tablet, 40 px on mobile.

## 2. Page Structure Overview
- **Global grid**
  - Desktop (`≥1280px`): `grid grid-cols-[minmax(0,3fr)_minmax(296px,1fr)] gap-10`.
  - Tablet (`768–1279px`): collapse to single column; sidebar modules render beneath the feed with `gap-12`.
  - Mobile (`<768px`): single column with reduced spacing (`gap-10`).
- **Vertical stack**
  1. Sticky navbar (existing).
  2. Hero block (`min-h-[420px]` desktop, `min-h-[360px]` tablet, `auto` mobile).
  3. Context strip (`h-12`) and sticky promo band (`min-h-[180px]`, sticks with `top-16` below nav).
  4. Feed grid (main column + sidebar).
  5. Supporting sections (Value Pillars → Explorer Carousel → Launch Playbooks).
  6. Secondary CTA strip.
  7. Footer.
- **Spacing tokens**
  - Top/bottom padding per section: desktop `py-20`, tablet `py-16`, mobile `py-12`.
  - Horizontal padding: follow page padding tokens; hero and supporting sections reuse `px-12` desktop, `px-8` tablet, `px-6` mobile.
- **Responsive behaviour**
  - Sidebar modules adopt `md:sticky md:top-24` desktop, stack below feed tablet/mobile.
  - Infinite scroll sentinel sits `pb-20` below the last card to avoid overlapping the sticky promo band.

### 2.1 Mobile Layout Details (`<768px`)
- **Header & Hero**
  - Navigation remains sticky; compress hero into a single column with media stacked below copy.
  - Hero padding: `px-4 py-12`; CTA buttons stack vertical with `gap-3`.
  - Taglines and CTAs maintain line clamps to avoid overflow.
- **Context & Promo**
  - Context strip becomes `text-sm` with `px-4`; promo banner reduces to `py-6`, removing sticky behaviour to conserve viewport height.
- **Feed & Sidebar Modules**
  - Feed cards retain fixed height; ensure vote pill scales to `px-3 py-1` and logo reduces to `48px`.
  - Sidebar modules collapse into accordion panels beneath the feed:
    - “Product Updates”, “Sponsored Spotlight”, “Top Categories”, “Paid Placements”.
    - Each accordion uses `rounded-2xl bg-white px-4 py-5` with disclosure icons.
  - Infinite scroll sentinel uses `mb-16` to provide breathing room above the footer.
- **Supporting Sections**
  - Value pillars transform into vertical stack (`space-y-6`).
  - Carousel converts to horizontal scroll (`snap-x overflow-x-auto px-4` with `snap-start` cards).
  - Launch playbooks and secondary CTA strip reduce padding to `px-4 py-10`.
- **Footer**
  - Maintain existing footer but ensure link columns stack properly (`space-y-6`).
  - Secondary CTA strip uses `flex-col` layout with centered buttons.

## 3. Hero Block
- Keep the existing navigation untouched; focus updates on the hero and body content.
- **Hero layout**
  - Two-column layout (left copy, right media) mirroring Product Hunt’s clarity and StartupListing’s social proof structure.
  - Left column:
    - Headline: “Launch faster. Get discovered sooner.”
    - Subhead: “Shipyard is the curated hub where indie founders submit in minutes, surface on curated feeds, and turn upvotes into traction.”
    - Primary CTA: “Submit your product” (filled button, 240 px wide, `bg-[#1C2333] text-white hover:bg-[#17202E]`).
    - Secondary CTA: “Browse launches” (ghost button with play icon, `border border-[#1C2333]/20 text-[#1C2333] hover:border-[#1C2333]/40`).
    - Microtrust line: “Home to micro‑SaaS, indie tools, and early‑stage products ready for discovery.”
  - Right column: looping video or animated mockup of the dashboard; fallback static image with layered shadows seen on LaunchDirectories’ hero.
  - Background: minimal wash (`bg-gradient-to-br from-white via-white to-[#F6F5F9]`) to keep it airy without breaking the white canvas.

## 4. Context Strip & Promo Band
- Immediately below the hero, add a slim bar (`h-12`) with muted text: “Featured launches for builders · Updated {{date}}”. Align left, keep it within content width.
- Follow with a sticky promo banner (reuse existing pain placement component): `Want guaranteed visibility? Upgrade to Featured Placement →`. Give it the sponsored tint (`bg-[#F3F0FF] text-[#1C2333]`) so it stands apart from standard cards while staying in the same visual family.

## 5. Product Feed

### 5.1 Layout
- Desktop: two-column layout (`grid grid-cols-[minmax(0,3fr)_minmax(260px,1fr)] gap-10`).
  - Main column hosts the launch cards (single column stack).
  - Right sidebar surfaces product updates, sponsored placements, and top categories.
- Tablet/mobile (≤1024 px): stack the columns (`grid-cols-1`). Sidebar modules collapse beneath the feed or into collapsible accordions.
- Maintain generous vertical spacing (`gap-12`) between cards within the main column.
- Implement infinite scroll for the main column:
  - Use an intersection observer (`<InView/>` or custom hook) at the bottom of the list to request the next page.
  - Maintain page size of 10 launches per request; stop observing when the API returns `hasMore = false`.
  - Show a skeleton loader (`min-h-[232px]` placeholders) while fetching.
- Provide an accessible fallback “Load more launches” button that appears only when intersection observers are not supported or the user prefers reduced motion (toggle via feature flag or user setting).

### 5.2 Card Anatomy (Full-Width)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Logo]  Name (wraps)                          Vote pill                       │
│         Tagline (concise value prop, 2 lines max)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│         Badge row (fixed height, collapses to spacer when empty)             │
├──────────────────────────────────────────────────────────────────────────────┤
│         Category pill                 Sponsored chip placeholder              │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Layout Mechanics**
  - Card container: `grid grid-rows-[auto_auto_24px_auto] min-h-[232px] rounded-3xl bg-white px-8 py-7 shadow-[0_18px_45px_-28px_rgba(28,35,51,0.35)] transition hover:-translate-y-1 hover:bg-[#F6F5F9]`.
  - Use `grid` so each row has a predictable height regardless of content variance.
  - Left gutter equals logo width + `gap-3` (`pl-[68px]`) for all indented rows; achieved by wrapping rows 2–4 in a `pl-[68px]` container.

- **Row 1 (Header)**
  - Left: 56 px rounded logo (`w-14 h-14 rounded-full overflow-hidden`).
  - Center: product name (`text-xl font-semibold leading-snug line-clamp-2`). If the name spans two lines, clamp ensures height remains within the allotted space.
  - Right: vote pill (`rounded-full px-4 py-1.5 flex items-center gap-2 bg-[#EEF0F6] text-[#1C2333] transition`). Icon fills and background animates when voted; behaviour unchanged from previous spec.

- **Row 2 (Tagline)**
  - `text-base text-[#1C2333] line-clamp-2`. Sits directly beneath the name within the same column so the eye flow stays tight.
  - Use `leading-relaxed` to keep two lines inside the allocated row height.

- **Row 3 (Badges)**
  - `h-6 flex flex-wrap items-center gap-2`.
  - Render badge pills (`text-xs px-2 py-1 rounded-full bg-[#F6F5F9] text-[#1C2333] uppercase tracking-wide`) when data exists.
  - When no badges are supplied, render an empty spacer `div` with `h-6` and `aria-hidden` so the row height remains identical across cards. This prevents jitter in the feed.

- **Row 4 (Meta)**
  - `flex items-center justify-between`.
  - Left: category pill (`text-sm font-medium px-3 py-1 rounded-full bg-[#EEF0F6] text-[#1C2333]`).
  - Right: sponsored chip placeholder (`w-[98px] h-6 flex items-center justify-end`). When `isSponsored` is true, render `text-xs px-3 py-1 rounded-full bg-[#E1D8FF] text-[#1C2333]`. Otherwise, render an `invisible` chip with the same dimensions so every card stays the same height and alignment.

- Entire card (`article role="link"`) is clickable and routes to the product detail page; keep auxiliary interactions (bookmark/share) in the sidebar or detail page to avoid expanding the card footprint.

### 5.3 Sponsored / Promoted Card
- Same structure, but background shifts to `bg-[#F3F0FF]`. Keep badge row behaviour identical; the bottom meta row renders the visible `Sponsored` chip using the placeholder slot so there is zero height variance. Vote pill remains identical to maintain muscle memory.

### 5.4 Interaction Treatments
- Hover state: card lifts slightly, base background shifts to `bg-[#F6F5F9]`, and the vote pill gains a soft shadow.
- Vote action: authenticated clicks trigger an optimistic increment (140 ms scale animation) and animate the pill fill (`bg-[#1C2333] text-white` or gradient); unauthenticated clicks open the sign-in modal without changing the count.

## 6. Supporting Sections

### 6.1 Value Pillars (“Why Shipyard”)
- Three cards spanning full width (1 row on desktop, stacked on mobile). Each uses icons and 2-line copy.
- Suggested copy aligned with the product:
  - “Launch in Minutes” — “Submit a product and publish when you’re ready—no lengthy onboarding.”
  - “Reach the Right Audience” — “Surface on curated feeds, categories, and the leaderboard watched by early adopters.”
  - “Grow with Upvotes” — “Collect social proof, climb the charts, and unlock featured boosts when you need them.”

### 6.2 Explorer Carousel
- Full-width slider showcasing discovery angles (e.g., “Latest Launches”, “Trending Categories”, “Editor’s Picks”, “Maker Spotlights”) similar to AI Directories’ featured tools.
- Each slide: 320 px card with illustration, short description, “Explore feed” CTA. Default slide background `bg-white` with hover tint `hover:bg-[#F6F5F9]`.

### 6.3 Launch Playbooks & Resources
- Two-column split:
  - Left: “Launch Playbooks” copy with CTA to guides on crafting listings, earning verified badges, and activating featured placement.
  - Right: stacked list of three resources (blog post on launch tips, changelog highlighting recent wins, community spotlight) using compact cards.
- Draw inspiration from LaunchDirectories’ FAQ/resonance blocks by keeping typography tight with soft layering (`bg-white shadow-[0_12px_32px_-20px_rgba(28,35,51,0.45)]`) instead of borders.

### 6.4 Secondary CTA Strip
- Narrow band before the existing footer: “Ready to boost your launch?” with two buttons (“Talk to the team”, “See featured plans”). Use a distinct background `bg-[#1C2333] text-white` so it mirrors the prominence of sponsored content without adding borders.

## 7. Motion & Micro-interactions
- Section reveals: fade + 24 px upward motion on scroll (duration 320 ms, ease out).
- Buttons: scale from 100% → 102% on hover with subtle shadow.
- CTA banner: optional glowing underline animation (3 s loop) to draw attention without overwhelming.
- Use consistent animation durations across hero media, cards, and toasts to maintain polish.

## 8. Implementation Notes
- Refactor the card component to accept just the required fields: `logo`, `name`, `badges[]`, `tagline`, `category`, `voteCount`, `isVoted`, and `isSponsored`.
- Ensure name and tagline use CSS line clamp to avoid layout shifts.
- Ensure the badge row maintains consistent height: render badge pills when available; otherwise inject a spacer (`h-6`). Do the same for the sponsored chip slot using an `invisible` chip to keep widths aligned.
- Wire infinite scroll to the launches API: add `cursor` or `page` query params, persist the accumulated results in the feed state, and guard against duplicate fetches with a `loading` flag.
- Reuse the existing data selectors; no additional metadata mapping is needed.
- Audit existing card and section styles to strip bold border accents; rely on the soft shadow + hover wash detailed here instead.
- Implement the vote pill with authentication gating: use the session context to decide whether to optimistically update or trigger the sign-in modal; expose state for `voted`, `loading`, and `disabled`.
- Update tests to cover:
  - Rendering for default vs. sponsored cards (background, chips).
  - Vote pill behavior (auth vs unauth, persisted “voted” visuals, accessibility focus states).
  - Responsive layout (desktop vs tablet vs mobile) ensuring single-column cards with sticky sidebar behavior.
- Provide a Storybook playground for the homepage card to confirm states (default, voted, sponsored).

## 9. Build Checklist
- [ ] Implement hero adjustments with updated copy, CTAs, and media.
- [ ] Refactor product card component to the specified anatomy.
- [ ] Apply two-column grid and “Load more launches” bar.
- [ ] Style sponsored variant with the dedicated tinted background and sponsored chip.
- [ ] Add supporting sections (value pillars, explorer carousel, resources) with existing content assets.
- [ ] Ensure secondary CTA strip integrates cleanly above the existing footer.
### 5.5 Sidebar Modules (Desktop)
- **Sponsored Spotlight**: card with the same `bg-[#F3F0FF]` tint and CTA to the advertiser; appears near the top.
- **Product Updates**: vertical list of latest ship logs or blog posts (title + date + link).
- **Top Categories**: list of 6–8 categories with pill buttons linking to `browse` filters.
- **Paid placement CTA**: compact banner (“Looking for more visibility? See featured plans”).
- Modules use `rounded-3xl bg-white px-6 py-6 shadow-[0_16px_40px_-30px_rgba(28,35,51,0.35)]` and employ sticky positioning (`md:sticky md:top-24`) so they remain visible while scrolling.
