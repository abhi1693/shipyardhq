import { SignIn, SignUp } from "@clerk/nextjs"

interface AuthFormPanelProps {
  mode: "sign-in" | "sign-up"
}

export default function AuthFormPanel({ mode }: AuthFormPanelProps) {
  const isSignIn = mode === "sign-in"

  return (
    <div className="flex items-center justify-center px-6 py-12 lg:px-16 lg:py-20">
      {isSignIn ? (
        <SignIn forceRedirectUrl="/member" />
      ) : (
        <SignUp forceRedirectUrl="/member" />
      )}
    </div>
  )
}
