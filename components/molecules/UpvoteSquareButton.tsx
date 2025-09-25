"use client"

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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

type State = { upvotes: number; upvoted: boolean; error?: string }

export default function UpvoteSquareButton({
  productId,
  initialCount,
  initialUpvoted = false,
  title,
  className,
  action,
}: Props) {
  const { isSignedIn } = useUser()
  const baseState = useMemo<State>(
    () => ({ upvotes: initialCount, upvoted: initialUpvoted, error: undefined }),
    [initialCount, initialUpvoted],
  )
  const [serverState, formAction] = useActionState(action, baseState)
  const [optimisticState, setOptimisticState] = useState<State>(baseState)
  const [pop, setPop] = useState(false)
  const prev = useRef<State>(baseState)

  useEffect(() => {
    setOptimisticState(baseState)
    prev.current = baseState
  }, [baseState])

  useEffect(() => {
    const next = serverState ?? baseState
    setOptimisticState(next)
  }, [serverState, baseState])

  useEffect(() => {
    if (
      optimisticState.upvotes !== prev.current.upvotes ||
      optimisticState.upvoted !== prev.current.upvoted
    ) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 220)
      prev.current = optimisticState
      return () => clearTimeout(t)
    }
  }, [optimisticState])

  function handleSubmit(formData: FormData) {
    const rollbackState = prev.current

    setOptimisticState((current) => {
      const nextUpvoted = !current.upvoted
      const delta = nextUpvoted ? 1 : -1
      const nextUpvotes = Math.max(current.upvotes + delta, 0)
      return { ...current, upvotes: nextUpvotes, upvoted: nextUpvoted, error: undefined }
    })

    const maybePromise = formAction(formData) as unknown
    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === "function") {
      ;(maybePromise as Promise<unknown>).catch(() => {
        setOptimisticState(rollbackState)
      })
    }
  }

  const ButtonInner = () => {
    const { pending } = useFormStatus()
    return (
      <button
        type="submit"
        disabled={pending || !isSignedIn}
        className="cursor-pointer disabled:opacity-70 disabled:cursor-pointer"
      >
        <UpvoteSquare
          count={optimisticState.upvotes}
          title={title}
          className={className}
          active={optimisticState.upvoted}
          pending={pending}
          pop={pop}
        />
      </button>
    )
  }

  const form = (
    <form action={handleSubmit}>
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
