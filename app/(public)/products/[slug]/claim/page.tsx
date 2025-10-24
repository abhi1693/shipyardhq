import Link from "next/link"
import { notFound } from "next/navigation"
import { JSX } from "react"

import { auth } from "@clerk/nextjs/server"

import { getPublicProductBySlug } from "@/actions/public/products/actions"
import { ClaimProductButton } from "@/components/molecules/ClaimProductButton"
import { Button } from "@/components/atoms/button"
import {
  evaluateClaimEligibility,
  isProductClaimableInGeneral,
} from "@/lib/products/claim"
import { generateVerificationTxtFromWebsite } from "@/lib/products/verification"
import { productClaimPath, productPath } from "@/lib/routes"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import SignInButton from "@/components/molecules/SignInButton"

export default async function ClaimProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const product = await getPublicProductBySlug(slug)
  if (!product) {
    return notFound()
  }

  const { userId: clerkId } = await auth()
  const viewer = clerkId ? await getActiveUserByClerkId(clerkId) : null
  const viewerId = viewer?.id ?? null

  const domain = (() => {
    if (!product.websiteUrl) return null
    try {
      return new URL(product.websiteUrl).hostname
    } catch {
      return null
    }
  })()

  const isClaimable = isProductClaimableInGeneral({
    isVerified: product.verification?.isVerified ?? false,
    productStatus: product.status,
  })

  const eligibility =
    viewerId && isClaimable
      ? evaluateClaimEligibility({
          submitterId: product.user?.id ?? null,
          viewerId,
          productStatus: product.status,
          isVerified: product.verification?.isVerified ?? false,
        })
      : null

  const expectedTxt =
    product.verification?.verificationTxt ??
    (product.websiteUrl
      ? generateVerificationTxtFromWebsite(product.websiteUrl)
      : null)

  const backHref = productPath(product.slug)
  const claimHref = productClaimPath(product.slug)

  let body: JSX.Element

  if (!isClaimable || !domain || !expectedTxt) {
    body = (
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Claiming is not available
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This listing is not currently eligible for claims. If you believe you
          should manage {product.name}, please contact support so we can help
          transfer ownership.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href={backHref}>Return to product</Link>
          </Button>
        </div>
      </div>
    )
  } else if (!viewer) {
    body = (
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Sign in to claim this product
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          You&apos;ll verify ownership of <strong>{domain}</strong> by adding a
          DNS TXT record. Sign in to continue and we&apos;ll walk you through
          the steps.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SignInButton
            mode="modal"
            forceRedirectUrl={claimHref}
            signUpForceRedirectUrl={claimHref}
          >
            <Button>Sign in</Button>
          </SignInButton>
          <Button asChild variant="outline">
            <Link href={backHref}>Back to product</Link>
          </Button>
        </div>
      </div>
    )
  } else if (eligibility?.status !== "eligible") {
    body = (
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Claim not available
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {eligibility?.reason ??
            "This listing cannot be claimed at the moment."}
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href={backHref}>Return to product</Link>
          </Button>
        </div>
      </div>
    )
  } else {
    body = (
      <div className="space-y-8 rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Claim {product.name}
          </h1>
          <p className="text-muted-foreground">
            Verify that you control <strong>{domain}</strong> by publishing the
            TXT record below. Once it&apos;s live, click claim and we&apos;ll
            transfer the listing to your account.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            DNS TXT record
          </div>
          <dl className="mt-4 space-y-3 text-sm text-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="font-medium text-muted-foreground">Type</dt>
              <dd className="font-semibold">TXT</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="font-medium text-muted-foreground">Host / Name</dt>
              <dd className="font-semibold">@</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-medium text-muted-foreground">
                Value / Content
              </dt>
              <dd className="overflow-hidden rounded-lg border border-border bg-white/80 p-3 font-mono text-xs tracking-tight text-foreground">
                {expectedTxt}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            DNS propagation can take a few minutes. If we can&apos;t find the
            record right away, wait a bit and try again.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ClaimProductButton productId={product.id} slug={product.slug} />
          <Button asChild variant="outline">
            <Link href={backHref}>Cancel</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 md:px-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Back to product
        </Link>
        <div className="mt-6">{body}</div>
      </div>
    </main>
  )
}
