"use client"

import { SignInButton as ClerkSignInButton } from "@clerk/nextjs"
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react"

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
    return (
      <ClerkSignInButton {...props}>{firstChild}</ClerkSignInButton>
    )
  }

  if (!isValidElement(firstChild)) {
    return <ClerkSignInButton {...props}>{firstChild}</ClerkSignInButton>
  }

  return <ClerkSignInButton {...props}>{firstChild}</ClerkSignInButton>
}
