"use client"

import { SignInButton as ClerkSignInButton } from "@clerk/nextjs"
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import {
  AUTH_DISABLED_MESSAGE,
  AUTH_DISABLED_SHORT_LABEL,
  AUTH_TEMPORARILY_DISABLED,
} from "@/lib/auth/availability"

type Props = ComponentProps<typeof ClerkSignInButton> & {
  children?: ReactNode
}

export default function SignInButton({ children, ...props }: Props) {
  const normalizedChildren = Children.toArray(children).filter((child) => {
    if (child === null || child === undefined) {
      return false
    }
    if (typeof child === "boolean") {
      return false
    }
    if (typeof child === "string") {
      return child.trim().length > 0
    }
    return true
  })

  const [firstChild, ...restChildren] = normalizedChildren

  if (AUTH_TEMPORARILY_DISABLED) {
    if (!firstChild) {
      return (
        <button
          type="button"
          disabled
          title={AUTH_DISABLED_MESSAGE}
          className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
        >
          {AUTH_DISABLED_SHORT_LABEL}
        </button>
      )
    }

    if (isValidElement(firstChild)) {
      const disablesNatively =
        typeof firstChild.type !== "string" ||
        ["button", "input", "select", "textarea"].includes(firstChild.type)
      const disabledProps: Record<string, unknown> = {
        "aria-disabled": true,
        title: AUTH_DISABLED_MESSAGE,
        onClick: (event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
        },
      }

      if (disablesNatively) {
        disabledProps.disabled = true
      }

      return cloneElement(
        firstChild as ReactElement<Record<string, unknown>>,
        disabledProps,
      )
    }

    return (
      <span aria-disabled="true" title={AUTH_DISABLED_MESSAGE}>
        {firstChild}
      </span>
    )
  }

  if (
    process.env.NODE_ENV !== "production" &&
    restChildren.length > 0 &&
    typeof window !== "undefined"
  ) {
    console.warn(
      "@shipyardhq/sign-in-button: multiple children detected. Only the first child will be forwarded to <SignInButton/>.",
    )
  }

  if (!firstChild) {
    return <ClerkSignInButton {...props} />
  }

  if (typeof firstChild === "string" || typeof firstChild === "number") {
    return <ClerkSignInButton {...props}>{firstChild}</ClerkSignInButton>
  }

  if (!isValidElement(firstChild)) {
    return <ClerkSignInButton {...props}>{firstChild}</ClerkSignInButton>
  }

  return <ClerkSignInButton {...props}>{firstChild}</ClerkSignInButton>
}
