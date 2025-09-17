"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useUser } from "@clerk/nextjs"
import { subscribeToNewsletterAction } from "@/actions/public/newsletter/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const DISMISS_KEY = "shipyardhq.newsletter.dismissed"
const SUBSCRIBED_KEY = "shipyardhq.newsletter.subscribed"

export function NewsletterBeacon({ className }: { className?: string }) {
  const { isLoaded, isSignedIn } = useUser()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [hasSubscribed, setHasSubscribed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !isLoaded) return

    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1"
    const subscribed = window.localStorage.getItem(SUBSCRIBED_KEY) === "1"
    setHasSubscribed(subscribed)

    if (!dismissed && !subscribed && !isSignedIn) {
      const timeout = window.setTimeout(() => setIsOpen(true), 1400)
      return () => window.clearTimeout(timeout)
    }
  }, [mounted, isLoaded, isSignedIn])

  const close = useCallback((persist = true) => {
    setIsOpen(false)
    if (persist) {
      try {
        window.localStorage.setItem(DISMISS_KEY, "1")
      } catch (error) {
        console.warn("Unable to persist newsletter dismissal", error)
      }
    }
  }, [])

  if (!mounted || isSignedIn || hasSubscribed) {
    return null
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[60] w-full max-w-xs sm:max-w-sm",
        className,
      )}
    >
      <Card className="relative border-primary/20 bg-gradient-to-br from-blue-50/95 via-white/95 to-sky-100/80 shadow-xl backdrop-blur dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-950/80">
        <button
          type="button"
          onClick={() => close()}
          aria-label="Dismiss newsletter invite"
          className="absolute right-3 top-3 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <CardHeader className="space-y-1 pb-2 pr-8">
          <CardTitle className="text-base font-semibold">
            Climb Aboard the Captain&apos;s Log
          </CardTitle>
          <CardDescription>
            Get a bottle mail whenever a fresh launch drops anchor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (isPending) return

              startTransition(async () => {
                setError(null)
                const trimmed = email.trim()
                const result = await subscribeToNewsletterAction(trimmed)
                if (result.error) {
                  setError(result.error)
                  return
                }

                try {
                  window.localStorage.setItem(SUBSCRIBED_KEY, "1")
                  window.localStorage.removeItem(DISMISS_KEY)
                } catch (storageError) {
                  console.warn(
                    "Unable to persist newsletter subscription",
                    storageError,
                  )
                }

                setHasSubscribed(true)
                setIsOpen(false)
                toast.success(
                  "All hands! You\'ll hear from us when new launches sail.",
                )
              })
            }}
          >
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@crewmail.com"
              autoComplete="email"
              required
            />
            {error ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No spam, just charted course updates from the shipyard crew.
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || email.trim().length === 0}
            >
              {isPending ? "Hoisting sails..." : "Signal the Lighthouse"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
