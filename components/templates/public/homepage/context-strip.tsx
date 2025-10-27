const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

import { PRICING_PATH } from "@/lib/routes"

export function HomepageContextStrip() {
  const formattedDate = DATE_FORMAT.format(new Date())

  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[#E6E9F5] bg-gradient-to-r from-[#F7F8FF] via-white to-[#F6F3FF] px-6 py-4 shadow-[0_26px_70px_-56px_rgba(7,58,104,0.32)]">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7B81A0]">
          Live bulletin
        </p>
        <p className="text-sm font-medium text-[#3B4256]">
          Featured launches for builders · Updated {formattedDate}
        </p>
      </div>
      <a
        href={`${PRICING_PATH}#featured`}
        className="inline-flex items-center gap-2 rounded-full bg-[#1C2333] px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_46px_-30px_rgba(28,35,51,0.55)] transition hover:bg-[#141A28]"
      >
        Become a sponsor
      </a>
    </div>
  )
}

export default HomepageContextStrip
