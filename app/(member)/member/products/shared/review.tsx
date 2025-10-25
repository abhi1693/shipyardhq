"use client"

import { useFormContext } from "react-hook-form"
import { Badge } from "@/components/atoms/badge"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Props = {
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
}

export default function Review({
  categories,
  organizations,
  alternatives,
}: Props) {
  const form = useFormContext()
  const v = form.getValues() as any
  const categoryName = categories.find((c) => c.id === v.categoryId)?.name
  const checks = (v.reviewChecks || {}) as Record<string, boolean>
  const issues: string[] = (v.reviewIssues || []) as string[]
  const alternativeMap = new Map(
    alternatives.map((alt) => [alt.id, alt] as const),
  )
  type AlternativeOption = (typeof alternatives)[number]
  const selectedAlternatives: AlternativeOption[] = Array.isArray(
    v.alternativeIds,
  )
    ? (v.alternativeIds as string[])
        .map((id) => alternativeMap.get(id))
        .filter((alt): alt is AlternativeOption => Boolean(alt))
    : []

  return (
    <div className="space-y-6">
      {/* Verification status */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Verification</h3>
        <div className="flex items-center gap-2 text-sm">
          <span>Status:</span>
          {v.verificationChecked ? (
            v.verificationSuccess ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="destructive">Not Found</Badge>
            )
          ) : null}
        </div>
        {v.verificationExpectedTxt ? (
          <div className="text-sm">
            <div className="font-medium">Expected TXT Value</div>
            <code className="break-all">{v.verificationExpectedTxt}</code>
          </div>
        ) : null}
      </section>

      {/* Checks Summary */}
      {issues.length ? (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Checks</h3>
          <div className="rounded border p-3 bg-destructive/5">
            <ul className="list-disc pl-5 text-sm">
              {issues.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Basics */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Basics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Info label="Name" value={v.name} />
          <Info label="Tagline" value={v.tagline} />
          <Info label="Website" value={v.websiteUrl} />
          <Info label="Category" value={categoryName} />
          <Info label="Type" value={(v.type || "").replace("_", " ")} />
          <Info label="Platforms" value={(v.platforms || []).join(", ")} />
          <Info
            label="Keywords"
            value={(v.keywordsText || "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
              .join(", ")}
          />
        </div>
        <div className="text-sm">
          <div className="font-medium mb-1">Description</div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: (props) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  />
                ),
              }}
            >
              {v.description || ""}
            </ReactMarkdown>
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Images</h3>
        <div className="grid grid-cols-2 gap-4">
          {v.logo ? (
            <div>
              <div className="text-sm font-medium mb-1">Logo</div>
              <Image
                src={v.logo}
                alt="Logo preview"
                width={80}
                height={80}
                className="object-contain rounded border"
              />
              {checks.logoOk === false ? (
                <div className="mt-1">
                  <Badge variant="destructive">Invalid</Badge>
                </div>
              ) : null}
            </div>
          ) : null}
          {v.bannerImage ? (
            <div>
              <div className="text-sm font-medium mb-1">Banner</div>
              <div className="relative h-32 w-full max-w-md rounded border overflow-hidden bg-muted">
                <Image
                  src={v.bannerImage}
                  alt="Banner preview"
                  fill
                  className="object-contain"
                />
              </div>
              {checks.bannerOk === false ? (
                <div className="mt-1">
                  <Badge variant="destructive">Invalid</Badge>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Info
            label="Model"
            value={(v.pricingModel || "").replace("_", " ")}
          />
          {v.startingPriceCents != null && v.currencyCode ? (
            <Info
              label="Starting Price"
              value={`${(v.startingPriceCents / 100).toFixed(2)} ${v.currencyCode}`}
            />
          ) : (
            <Info label="Starting Price" value="—" />
          )}
          {checks.websiteOk === false ? (
            <div className="flex items-center gap-2">
              <span className="w-40 text-muted-foreground">Website</span>
              <a
                href={v.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-all"
              >
                {v.websiteUrl}
              </a>
              <Badge variant="destructive">Invalid</Badge>
            </div>
          ) : null}
        </div>
      </section>

      {/* Links & Contact */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Links & Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Info label="GitHub" value={v.githubUrl} />
          {checks.githubOk === false && v.githubUrl ? (
            <div className="flex items-center gap-2">
              <span className="w-40 text-muted-foreground">GitHub</span>
              <a
                href={v.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-all"
              >
                {v.githubUrl}
              </a>
              <Badge variant="destructive">Invalid</Badge>
            </div>
          ) : null}
          <Info label="Twitter" value={v.twitterUrl} />
          {checks.twitterOk === false && v.twitterUrl ? (
            <div className="flex items-center gap-2">
              <span className="w-40 text-muted-foreground">Twitter</span>
              <a
                href={v.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-all"
              >
                {v.twitterUrl}
              </a>
              <Badge variant="destructive">Invalid</Badge>
            </div>
          ) : null}
          <Info label="Demo" value={v.demoUrl} />
          {checks.demoOk === false && v.demoUrl ? (
            <div className="flex items-center gap-2">
              <span className="w-40 text-muted-foreground">Demo</span>
              <a
                href={v.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-all"
              >
                {v.demoUrl}
              </a>
              <Badge variant="destructive">Invalid</Badge>
            </div>
          ) : null}
          <Info label="Contact Email" value={v.contactEmail} />
        </div>
      </section>

      {/* CTA & Organization */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">CTA & Organization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Info
            label="Organization"
            value={
              organizations.find((o: any) => o.id === v.organizationId)?.name ||
              (v.organizationId ? v.organizationId : "Personal")
            }
          />
          <Info label="CTA Label" value={v.ctaLabel} />
          <Info label="CTA URL" value={v.ctaUrl} />
        </div>
      </section>

      {/* Competitive Alternatives */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Competitive Alternatives</h3>
        {selectedAlternatives.length ? (
          <ul className="space-y-2 text-sm">
            {selectedAlternatives.map((alt) => (
              <li
                key={alt.id}
                className="flex flex-col rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="font-medium text-slate-900">
                  {alt.name}
                </span>
                {alt.websiteUrl ? (
                  <a
                    href={alt.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {alt.websiteUrl}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t selected any competitive alternatives yet.
          </p>
        )}
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value)
    return (
      <div className="flex items-start gap-2">
        <div className="w-40 text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">—</div>
      </div>
    )
  return (
    <div className="flex items-start gap-2">
      <div className="w-40 text-muted-foreground">{label}</div>
      <div className="break-all">{value}</div>
    </div>
  )
}
