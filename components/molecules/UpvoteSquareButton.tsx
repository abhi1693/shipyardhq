"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@clerk/nextjs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"

interface Props {
  productId: string
  initialCount: number
  initialUpvoted?: boolean
  title?: string
  className?: string
}

type State = { upvotes: number; upvoted: boolean; error?: string }

export default function UpvoteSquareButton({
  productId,
  initialCount,
  initialUpvoted = false,
  title,
  className,
}: Props) {
  const { isSignedIn } = useUser()
  const baseState = useMemo<State>(
    () => ({
      upvotes: initialCount,
      upvoted: initialUpvoted,
      error: undefined,
    }),
    [initialCount, initialUpvoted],
  )
  const [state, setState] = useState<State>(baseState)
  const [pop, setPop] = useState(false)
  const [pending, setPending] = useState(false)
  const prev = useRef<State>(baseState)

  useEffect(() => {
    setState(baseState)
    prev.current = baseState
  }, [baseState])

  useEffect(() => {
    if (
      state.upvotes !== prev.current.upvotes ||
      state.upvoted !== prev.current.upvoted
    ) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 220)
      prev.current = state
      return () => clearTimeout(t)
    }
  }, [state])

  async function handleClick() {
    if (pending || !isSignedIn) return

    const rollbackState = prev.current

    setState((current) => {
      const nextUpvoted = !current.upvoted
      const delta = nextUpvoted ? 1 : -1
      const nextUpvotes = Math.max(current.upvotes + delta, 0)
      return {
        ...current,
        upvotes: nextUpvotes,
        upvoted: nextUpvoted,
        error: undefined,
      }
    })

    setPending(true)
    try {
      const response = await fetch(`/api/products/${productId}/upvote`, {
        method: "POST",
      })
      const payload = (await response
        .json()
        .catch(() => ({}))) as Partial<State>

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to upvote",
        )
      }

      setState((current) => ({
        upvotes:
          typeof payload.upvotes === "number"
            ? payload.upvotes
            : current.upvotes,
        upvoted:
          typeof payload.upvoted === "boolean"
            ? payload.upvoted
            : current.upvoted,
        error: undefined,
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update upvote"
      setState({ ...rollbackState, error: message })
    } finally {
      setPending(false)
    }
  }

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || !isSignedIn}
      className="cursor-pointer disabled:opacity-70 disabled:cursor-pointer"
    >
      <UpvoteSquare
        count={state.upvotes}
        title={title}
        className={className}
        active={state.upvoted}
        pending={pending}
        pop={pop}
      />
    </button>
  )

  if (!isSignedIn) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent sideOffset={6}>Sign in to upvote</TooltipContent>
      </Tooltip>
    )
  }

  return button
}
