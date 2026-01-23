import { SignIn, SignUp } from "@clerk/nextjs"
import { MEMBER_BASE_PATH } from "@/lib/routes"

interface AuthFormPanelProps {
  mode: "sign-in" | "sign-up"
  redirectUrl?: string
}

export default function AuthFormPanel({
  mode,
  redirectUrl,
}: AuthFormPanelProps) {
  const isSignIn = mode === "sign-in"
  const finalRedirectUrl = redirectUrl ?? MEMBER_BASE_PATH

  return (
    <div className="flex items-center justify-center px-6 py-12 lg:px-16 lg:py-20">
      {isSignIn ? (
        <SignIn
          forceRedirectUrl={finalRedirectUrl}
          fallbackRedirectUrl={finalRedirectUrl}
        />
      ) : (
        <SignUp
          forceRedirectUrl={finalRedirectUrl}
          fallbackRedirectUrl={finalRedirectUrl}
        />
      )}
    </div>
  )
}
