import Image from "next/image"

export default function AuthMarketingPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between bg-zinc-950 p-10 text-white">
      {/* Flowing animated gradient background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(-45deg,_#0f172a,_#1e293b,_#334155,_#0f172a)] bg-[length:400%_400%] animate-gradient-flow opacity-80" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col justify-center h-full max-w-md space-y-10">
        {/* Branding */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            ShipYard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">The Micro‑SaaS Directory</p>
        </div>

        {/* Hero Content */}
        <div>
          <h2 className="text-2xl font-semibold">Discover. Launch. Grow.</h2>
          <p className="mt-4 text-base text-zinc-400 leading-relaxed">
            ShipYard is your dock for discovering niche SaaS tools, showcasing
            your products, and connecting with indie founders. Whether you&#39;re
            a maker or an early adopter, this is where great ideas set sail.
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400" />
            400+ Micro-SaaS projects listed
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400" />
            Built by real indie developers
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400" />
            Curated with zero fluff
          </li>
        </ul>
      </div>

      {/* Testimonial */}
      <div className="relative z-10 mt-10 max-w-md border-l-2 border-emerald-500 pl-4">
        <blockquote className="text-zinc-300 text-sm italic leading-relaxed">
          “The best place I’ve found new tools, inspiration, and makers to
          follow. ShipYard feels like Product Hunt for micro‑SaaS.”
        </blockquote>
        <div className="mt-4 flex items-center gap-3">
          <Image
            src="/avatars/user1.jpg"
            alt="Maya Chen"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <div className="text-sm font-medium">Maya Chen</div>
            <div className="text-xs text-zinc-400">Founder @ Notionables</div>
          </div>
        </div>
      </div>
    </div>
  )
}
