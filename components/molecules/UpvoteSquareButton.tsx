"use client"

import { useEffect, useRef, useState, useActionState } from "react"
import { useFormStatus } from "react-dom"
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
  action: (
    prevState: { upvotes: number; upvoted: boolean; error?: string },
    formData: FormData,
  ) => Promise<{ upvotes: number; upvoted: boolean; error?: string }>
}

export default function UpvoteSquareButton({
  productId,
  initialCount,
  initialUpvoted = false,
  title,
  className,
  action,
}: Props) {
  const { isSignedIn } = useUser()
  const [state, formAction] = useActionState(action, {
    upvotes: initialCount,
    upvoted: initialUpvoted,
  })
  const [pop, setPop] = useState(false)
  const prev = useRef({ upvotes: initialCount, upvoted: initialUpvoted })

  useEffect(() => {
    if (
      state.upvotes !== prev.current.upvotes ||
      state.upvoted !== prev.current.upvoted
    ) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 220)
      prev.current = { upvotes: state.upvotes, upvoted: state.upvoted }
      return () => clearTimeout(t)
    }
  }, [state.upvotes, state.upvoted])

  const ButtonInner = () => {
    const { pending } = useFormStatus()
    return (
      <button
        type="submit"
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
  }

  const form = (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <ButtonInner />
    </form>
  )

  if (!isSignedIn) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{form}</TooltipTrigger>
        <TooltipContent sideOffset={6}>Sign in to upvote</TooltipContent>
      </Tooltip>
    )
  }

  return form
}
