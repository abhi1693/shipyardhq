import { SignIn as ClerkSignInForm } from "@clerk/nextjs"
import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sign in | ShipYardHQ.dev",
  description: "Sign in to list, discover, and explore micro-SaaS tools.",
}

export default function LoginViewPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* LEFT PANEL */}
      <div className="relative hidden lg:flex flex-col justify-between bg-zinc-950 p-10 text-white">
        {/* Flowing animated gradient background */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(-45deg,_#0f172a,_#1e293b,_#334155,_#0f172a)] bg-[length:400%_400%] animate-gradient-flow opacity-80" />

        {/* Main Content */}
        <div className="relative z-10 flex flex-col justify-center h-full max-w-md space-y-10">
          {/* Brand + Tagline now grouped with Hero */}
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              ShipYard
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              The Micro‑SaaS Directory
            </p>
          </div>

          {/* Headline + Description */}
          <div>
            <h2 className="text-2xl font-semibold">Discover. Launch. Grow.</h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              ShipYard is your home for discovering niche SaaS tools, showcasing
              your products, and connecting with indie founders. Whether
              you&#39;re a maker or an early adopter, this is where great ideas
              get discovered.
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

        {/* Testimonial stays at the bottom */}
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

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center p-6 lg:p-16">
        <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-800">
              Sign in to ShipYard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              List your product or discover new micro-SaaS gems.
            </p>
          </div>

          <ClerkSignInForm
            appearance={{
              elements: {
                card: "shadow-lg border border-zinc-100",
              },
            }}
          />

          <p className="text-sm text-zinc-500">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
