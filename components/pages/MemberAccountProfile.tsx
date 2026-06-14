"use client"

import { useClerk, useReverification, useUser } from "@clerk/nextjs"
import type {
  CreateExternalAccountParams,
  EmailAddressResource,
  ExternalAccountResource,
  OAuthStrategy,
  UpdateUserParams,
} from "@clerk/nextjs/types"
import { format } from "date-fns"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Mail,
  MoreVertical,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserPen,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { ChangeEvent, FormEvent } from "react"
import { useState } from "react"
import { toast } from "sonner"

import { deleteCurrentMemberAccountAction } from "@/actions/member/account/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { Input } from "@/components/atoms/input"
import { UserAvatarProfile } from "@/components/molecules/UserAvatarProfile"
import { MemberAccountProfileSkeleton } from "@/components/pages/MemberAccountProfile.skeleton"
import { HOME_PATH, MEMBER_ACCOUNT_PROFILE_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

type ClerkErrorPayload = {
  errors?: Array<{
    longMessage?: string
    message?: string
  }>
  message?: string
}

export type MemberAccountProfileData = {
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  createdAt: string | null
}

type ClerkWithConnectionSettings = ReturnType<typeof useClerk> & {
  __internal_environment?: {
    userSettings?: {
      socialProviderStrategies?: OAuthStrategy[]
    }
  }
}

type OAuthOption = {
  strategy: OAuthStrategy
  label: string
}

const dialogLabelClassName =
  "flex flex-col gap-2 text-sm font-medium text-slate-700"

function getJoinedLabel(createdAt?: Date | string | number | null) {
  if (!createdAt) return "Joined recently"
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return "Joined recently"
  return `Joined ${format(date, "MMMM yyyy")}`
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const payload = error as ClerkErrorPayload
    return (
      payload.errors?.[0]?.longMessage ??
      payload.errors?.[0]?.message ??
      payload.message ??
      fallback
    )
  }

  return fallback
}

function normalizeProvider(provider: string) {
  return provider.replace(/^oauth_/, "").replace(/^custom_/, "")
}

function formatProviderName(provider?: string) {
  if (!provider) return "Connected account"
  return normalizeProvider(provider)
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function buildOAuthOption(strategy: OAuthStrategy): OAuthOption {
  return {
    strategy,
    label: formatProviderName(strategy),
  }
}

function formatDbLabel(value?: string | null) {
  if (!value) return null
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function GoogleLogo() {
  return (
    <svg height="20" viewBox="0 0 24 24" width="20" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function GitHubLogo() {
  return (
    <svg height="20" viewBox="0 0 24 24" width="20" aria-hidden>
      <path
        fill="#0f172a"
        d="M12 .5a12 12 0 0 0-3.8 23.38c.6.1.82-.26.82-.58v-2.05c-3.34.73-4.04-1.41-4.04-1.41-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.44 11.44 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.38.82 1.1.82 2.23v3.31c0 .32.21.69.83.58A12 12 0 0 0 12 .5Z"
      />
    </svg>
  )
}

function SlackLogo() {
  return (
    <svg height="20" viewBox="0 0 24 24" width="20" aria-hidden>
      <path fill="#36C5F0" d="M8.5 2a2 2 0 0 0 0 4h2V4a2 2 0 0 0-2-2Z" />
      <path
        fill="#2EB67D"
        d="M13.5 2a2 2 0 0 0-2 2v5a2 2 0 1 0 4 0V4a2 2 0 0 0-2-2Z"
      />
      <path fill="#ECB22E" d="M22 8.5a2 2 0 0 0-4 0v2h2a2 2 0 0 0 2-2Z" />
      <path
        fill="#E01E5A"
        d="M22 13.5a2 2 0 0 0-2-2h-5a2 2 0 1 0 0 4h5a2 2 0 0 0 2-2Z"
      />
      <path fill="#36C5F0" d="M15.5 22a2 2 0 0 0 0-4h-2v2a2 2 0 0 0 2 2Z" />
      <path
        fill="#2EB67D"
        d="M10.5 22a2 2 0 0 0 2-2v-5a2 2 0 1 0-4 0v5a2 2 0 0 0 2 2Z"
      />
      <path fill="#ECB22E" d="M2 15.5a2 2 0 0 0 4 0v-2H4a2 2 0 0 0-2 2Z" />
      <path
        fill="#E01E5A"
        d="M2 10.5a2 2 0 0 0 2 2h5a2 2 0 1 0 0-4H4a2 2 0 0 0-2 2Z"
      />
    </svg>
  )
}

function ProviderLogo({ provider }: { provider?: string }) {
  const normalized = provider?.toLowerCase()

  if (normalized?.includes("google")) return <GoogleLogo />
  if (normalized?.includes("github")) {
    return <GitHubLogo />
  }
  if (normalized?.includes("slack")) {
    return <SlackLogo />
  }

  return <ShieldCheck className="h-5 w-5 text-slate-500" aria-hidden />
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {children}
    </section>
  )
}

function ActionButton({
  children,
  className,
  variant = "ghost",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-slate-950 text-white hover:bg-slate-800",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-700 hover:bg-[#eff4ff] hover:text-blue-700",
        variant === "ghost" && "text-blue-700 hover:underline",
        variant === "danger" &&
          "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export default function MemberAccountProfile({
  profile,
}: {
  profile: MemberAccountProfileData | null
}) {
  const router = useRouter()
  const clerk = useClerk() as ClerkWithConnectionSettings
  const { user, isLoaded } = useUser()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [emailToVerify, setEmailToVerify] =
    useState<EmailAddressResource | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const updateProfile = useReverification((params: UpdateUserParams) =>
    user?.update(params),
  )
  const createEmailAddress = useReverification((email: string) =>
    user?.createEmailAddress({ email }),
  )
  const deleteEmailAddress = useReverification((email: EmailAddressResource) =>
    email.destroy(),
  )
  const createExternalAccount = useReverification(
    (params: CreateExternalAccountParams) =>
      user?.createExternalAccount(params),
  )
  const deleteExternalAccount = useReverification(
    (account: ExternalAccountResource) => account.destroy(),
  )

  const emails = user?.emailAddresses ?? []
  const externalAccounts = user?.externalAccounts ?? []
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ?? emails[0]?.emailAddress
  const dbDisplayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    profile?.email ||
    "Profile"
  const dbRole = formatDbLabel(profile?.role)
  const dbStatus = formatDbLabel(profile?.status)
  const dbProfileLine = [dbRole, profile?.email].filter(Boolean).join(" · ")
  const accountDeleteEmail = profile?.email ?? primaryEmail ?? ""
  const deleteConfirmationMatches =
    accountDeleteEmail.length > 0 &&
    deleteConfirmation.trim() === accountDeleteEmail

  const connectedProviders = new Set<string>(
    externalAccounts.map((account) => normalizeProvider(account.provider)),
  )
  const enabledOAuthOptions =
    clerk.__internal_environment?.userSettings?.socialProviderStrategies?.map(
      buildOAuthOption,
    ) ?? []
  const unconnectedOAuthOptions = enabledOAuthOptions.filter((option) => {
    const provider = normalizeProvider(option.strategy)
    return !connectedProviders.has(provider)
  })

  if (!isLoaded) {
    return <MemberAccountProfileInlineSkeleton />
  }

  if (!user) {
    return (
      <div className="w-full max-w-[1000px] rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to manage your account.
      </div>
    )
  }

  const accountUser = user

  function openProfileDialog() {
    setFirstName(accountUser.firstName ?? "")
    setLastName(accountUser.lastName ?? "")
    setProfileDialogOpen(true)
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyAction("profile")

    try {
      await updateProfile({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      })
      await accountUser.reload()
      router.refresh()
      setProfileDialogOpen(false)
      toast.success("Profile updated")
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update profile"))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleProfileImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    setBusyAction("profile-image")
    try {
      await accountUser.setProfileImage({ file })
      await accountUser.reload()
      router.refresh()
      toast.success("Profile photo updated")
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update profile photo"))
    } finally {
      event.target.value = ""
      setBusyAction(null)
    }
  }

  async function handleAddEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = newEmail.trim()
    if (!email) return

    setBusyAction("email-add")
    try {
      const createdEmail = await createEmailAddress(email)
      if (!createdEmail) throw new Error("Email address was not created")
      await createdEmail.prepareVerification({ strategy: "email_code" })
      setEmailToVerify(createdEmail)
      setVerificationCode("")
      toast.success("Verification code sent")
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add email address"))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleVerifyEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!emailToVerify || !verificationCode.trim()) return

    setBusyAction("email-verify")
    try {
      const result = await emailToVerify.attemptVerification({
        code: verificationCode.trim(),
      })

      if (result.verification.status !== "verified") {
        toast.error("Verification is not complete yet")
        return
      }

      await accountUser.reload()
      router.refresh()
      setEmailDialogOpen(false)
      setEmailToVerify(null)
      setNewEmail("")
      setVerificationCode("")
      toast.success("Email address verified")
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to verify email address"))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleSetPrimaryEmail(email: EmailAddressResource) {
    setBusyAction(`email-primary-${email.id}`)

    try {
      await updateProfile({ primaryEmailAddressId: email.id })
      await accountUser.reload()
      router.refresh()
      toast.success("Primary email updated")
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update primary email"))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDeleteEmail(email: EmailAddressResource) {
    setBusyAction(`email-delete-${email.id}`)

    try {
      await deleteEmailAddress(email)
      await accountUser.reload()
      router.refresh()
      toast.success("Email address removed")
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove email address"))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleConnectAccount(strategy: OAuthStrategy) {
    setBusyAction(`oauth-${strategy}`)

    try {
      const result = await createExternalAccount({
        strategy,
        redirectUrl: MEMBER_ACCOUNT_PROFILE_PATH,
      })
      const redirectUrl =
        result?.verification?.externalVerificationRedirectURL?.href

      if (redirectUrl) {
        router.push(redirectUrl)
        return
      }

      await accountUser.reload()
      router.refresh()
      toast.success("Connected account added")
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to connect account"))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDeleteExternalAccount(account: ExternalAccountResource) {
    setBusyAction(`oauth-delete-${account.id}`)

    try {
      await deleteExternalAccount(account)
      await accountUser.reload()
      router.refresh()
      toast.success(`${formatProviderName(account.provider)} disconnected`)
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to disconnect account"))
    } finally {
      setBusyAction(null)
    }
  }

  function handleReverifyExternalAccount(account: ExternalAccountResource) {
    const redirectUrl = account.verification?.externalVerificationRedirectURL
    if (redirectUrl) router.push(redirectUrl.href)
  }

  async function handleDeleteAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!deleteConfirmationMatches) {
      toast.error("Type your account email to confirm deletion")
      return
    }

    setBusyAction("account-delete")

    try {
      const result = await deleteCurrentMemberAccountAction()

      if (result?.error) {
        toast.error(result.error)
        return
      }

      window.location.assign(HOME_PATH)
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete account"))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="w-full max-w-[1000px] space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
          Account Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure your personal profile, email addresses, and connected
          accounts.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-950">
                Profile details
              </h2>
              <ActionButton onClick={openProfileDialog}>
                <UserPen className="h-4 w-4" aria-hidden />
                Update profile
              </ActionButton>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <label className="relative h-20 w-20 shrink-0 cursor-pointer rounded-full border-2 border-[#dce9ff] bg-slate-50">
                  <UserAvatarProfile
                    user={accountUser}
                    size={80}
                    className="h-20 w-20 rounded-full"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100">
                    <Upload className="h-5 w-5" aria-hidden />
                    <span className="sr-only">Upload profile photo</span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={busyAction === "profile-image"}
                    onChange={handleProfileImageChange}
                  />
                </label>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-slate-950">
                      {dbDisplayName}
                    </h3>
                    {dbStatus ? (
                      <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-green-700">
                        <Check className="h-3 w-3" aria-hidden />
                        {dbStatus}
                      </span>
                    ) : null}
                  </div>
                  {dbProfileLine ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {dbProfileLine}
                    </p>
                  ) : null}
                  {profile?.createdAt ? (
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {getJoinedLabel(profile.createdAt)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-950">
                Email addresses
              </h2>
              <ActionButton
                onClick={() => {
                  setEmailDialogOpen(true)
                  setEmailToVerify(null)
                  setVerificationCode("")
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add email address
              </ActionButton>
            </div>
            <div className="divide-y divide-slate-200">
              {emails.length ? (
                emails.map((email) => {
                  const isPrimary = email.emailAddress === primaryEmail
                  const verified = email.verification?.status === "verified"

                  return (
                    <div
                      key={email.id}
                      className="flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <Mail className="h-5 w-5 shrink-0 text-slate-500" />
                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                          <span className="truncate text-sm text-slate-950">
                            {email.emailAddress}
                          </span>
                          {isPrimary ? (
                            <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                              Primary
                            </span>
                          ) : null}
                          {!isPrimary && verified ? (
                            <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-green-700">
                              Verified
                            </span>
                          ) : null}
                          {!verified ? (
                            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">
                              Unverified
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {!isPrimary && verified ? (
                          <ActionButton
                            variant="secondary"
                            disabled={
                              busyAction === `email-primary-${email.id}`
                            }
                            onClick={() => handleSetPrimaryEmail(email)}
                          >
                            Make primary
                          </ActionButton>
                        ) : null}
                        {!isPrimary ? (
                          <ActionButton
                            variant="danger"
                            disabled={busyAction === `email-delete-${email.id}`}
                            onClick={() => handleDeleteEmail(email)}
                            aria-label={`Remove ${email.emailAddress}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Remove
                          </ActionButton>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-slate-400"
                            aria-label={`${email.emailAddress} is primary`}
                          >
                            <MoreVertical className="h-5 w-5" aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-6 text-sm text-slate-500">
                  No email addresses are attached to this account.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-950">
                Connected accounts
              </h2>
            </div>
            <div className="space-y-4 p-6">
              {externalAccounts.length ? (
                externalAccounts.map((account) => {
                  const provider = formatProviderName(account.provider)
                  const accountLabel =
                    account.emailAddress ??
                    account.username ??
                    account.providerUserId ??
                    "Connected"
                  const isVerified =
                    account.verification?.status === "verified" ||
                    account.verification === null

                  return (
                    <div
                      key={account.id}
                      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-white shadow-sm">
                          <ProviderLogo provider={account.provider} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-950">
                              {provider}
                            </span>
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                                isVerified
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-orange-50 text-orange-700",
                              )}
                            >
                              {isVerified ? "Active" : "Needs verification"}
                            </span>
                          </div>
                          <span className="block truncate text-sm text-slate-500">
                            {accountLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {!isVerified &&
                        account.verification
                          ?.externalVerificationRedirectURL ? (
                          <ActionButton
                            variant="secondary"
                            onClick={() =>
                              handleReverifyExternalAccount(account)
                            }
                          >
                            Reverify
                          </ActionButton>
                        ) : null}
                        <ActionButton
                          variant="danger"
                          disabled={busyAction === `oauth-delete-${account.id}`}
                          onClick={() => handleDeleteExternalAccount(account)}
                        >
                          <X className="h-4 w-4" aria-hidden />
                          Disconnect
                        </ActionButton>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No connected OAuth accounts yet.
                </div>
              )}

              {unconnectedOAuthOptions.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unconnectedOAuthOptions.map((option) => (
                    <button
                      key={option.strategy}
                      type="button"
                      disabled={busyAction === `oauth-${option.strategy}`}
                      onClick={() => handleConnectAccount(option.strategy)}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 transition-all hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Connect {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="border-red-100 hover:shadow-[0_4px_12px_rgba(185,28,28,0.08)]">
            <div className="border-b border-red-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-red-700">
                Delete account
              </h2>
            </div>
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-medium text-slate-950">
                  Permanently remove your Shipyard account.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  This deletes all account-related data, including products,
                  rewards, purchases, product media, and login access. This
                  cannot be reversed.
                </p>
              </div>
              <ActionButton
                variant="danger"
                onClick={() => {
                  setDeleteConfirmation("")
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete account
              </ActionButton>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="rounded-xl border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle>Update profile</DialogTitle>
            <DialogDescription>
              Changes are saved through Clerk and reflected across your account.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={dialogLabelClassName}>
                First name
                <Input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="rounded-lg border-slate-200 bg-white"
                />
              </label>
              <label className={dialogLabelClassName}>
                Last name
                <Input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="rounded-lg border-slate-200 bg-white"
                />
              </label>
            </div>
            <DialogFooter className="pt-2">
              <ActionButton
                variant="secondary"
                onClick={() => setProfileDialogOpen(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={busyAction === "profile"}
              >
                Save profile
              </ActionButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="rounded-xl border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle>
              {emailToVerify ? "Verify email address" : "Add email address"}
            </DialogTitle>
            <DialogDescription>
              Clerk sends a one-time code before the address is added to the
              account.
            </DialogDescription>
          </DialogHeader>
          {emailToVerify ? (
            <form className="space-y-4" onSubmit={handleVerifyEmailSubmit}>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                Enter the code sent to {emailToVerify.emailAddress}.
              </div>
              <label className={dialogLabelClassName}>
                Verification code
                <Input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  inputMode="numeric"
                  className="rounded-lg border-slate-200 bg-white"
                />
              </label>
              <DialogFooter className="pt-2">
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setEmailToVerify(null)
                    setVerificationCode("")
                  }}
                >
                  Back
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={busyAction === "email-verify"}
                >
                  Verify email
                </ActionButton>
              </DialogFooter>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleAddEmailSubmit}>
              <label className={dialogLabelClassName}>
                Email address
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  className="rounded-lg border-slate-200 bg-white"
                  placeholder="founder@company.com"
                />
              </label>
              <DialogFooter className="pt-2">
                <ActionButton
                  variant="secondary"
                  onClick={() => setEmailDialogOpen(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={busyAction === "email-add"}
                >
                  Send code
                </ActionButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-xl border-red-100 bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              Delete account
            </DialogTitle>
            <DialogDescription>
              This permanently deletes all account-related Shipyard data and
              account access. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleDeleteAccountSubmit}>
            {accountDeleteEmail ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                Type <span className="font-semibold">{accountDeleteEmail}</span>{" "}
                to confirm.
              </div>
            ) : null}
            <label className={dialogLabelClassName}>
              Account email
              <Input
                type="email"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="rounded-lg border-slate-200 bg-white"
                placeholder={accountDeleteEmail}
              />
            </label>
            <DialogFooter className="pt-2">
              <ActionButton
                variant="secondary"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="submit"
                variant="danger"
                disabled={
                  busyAction === "account-delete" || !deleteConfirmationMatches
                }
              >
                Delete permanently
              </ActionButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemberAccountProfileInlineSkeleton() {
  return <MemberAccountProfileSkeleton />
}
