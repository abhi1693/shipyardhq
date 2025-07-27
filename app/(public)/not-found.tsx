"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/atoms/button"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center relative overflow-hidden px-6 text-center">
      {/* Flowing animated gradient background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(-45deg,_#0f172a,_#1e293b,_#334155,_#0f172a)] bg-[length:400%_400%] animate-gradient-flow opacity-80" />

      <div className="relative z-10 flex flex-col items-center max-w-xl">
        <h1 className="text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white/80 to-white/20 leading-none">
          404
        </h1>

        <h2 className="text-3xl font-bold mt-4">Page Not Found</h2>
        <p className="mt-2 text-zinc-400">
          Sorry, the page you’re looking for doesn’t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button onClick={() => router.back()} variant="default" size="lg">
            Go Back
          </Button>
          <Button onClick={() => router.push("/")} variant="ghost" size="lg">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
