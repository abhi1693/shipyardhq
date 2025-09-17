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
          <p className="text-sm text-zinc-400 mt-1">A harbor for indie SaaS</p>
        </div>

        {/* Hero Content */}
        <div>
          <h2 className="text-2xl font-semibold">Set sail. Build boldly.</h2>
          <p className="mt-4 text-base text-zinc-400 leading-relaxed">
            ShipYard is where indie products find their sea legs. Dock your
            project, meet a helpful crew, and catch tailwinds toward your next
            milestone. Calm waters today, brighter horizons tomorrow.
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400" />
            Built for indie makers, by indie makers
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400" />
            Showcase your product and find early fans
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400" />
            Friendly waters, honest feedback, real momentum
          </li>
        </ul>
      </div>

      {/* Testimonial */}
      <div className="relative z-10 mt-10 max-w-md border-l-2 border-emerald-500 pl-4">
        <blockquote className="text-zinc-300 text-sm italic leading-relaxed">
          “Every launch needs a lighthouse. We’ll keep the beam steady while you
          steer.”
        </blockquote>
        <div className="mt-4 flex items-center gap-3">
          <div>
            <div className="text-sm font-medium">The ShipYard Crew</div>
            <div className="text-xs text-zinc-400">Guiding builders to calm waters</div>
          </div>
        </div>
      </div>
    </div>
  )
}
