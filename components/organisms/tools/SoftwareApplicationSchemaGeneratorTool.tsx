"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import {
  CopyableCode,
  DownloadTextButton,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "@/components/organisms/tools/ToolWorkspaceUi"
import {
  generateSoftwareApplicationSchema,
  wrapJsonLdInScriptTag,
} from "@/lib/tools/generators"

const inputClassName = "h-10 border-slate-300 bg-white"

const categories = [
  "BusinessApplication",
  "DeveloperApplication",
  "DesignApplication",
  "FinanceApplication",
  "GameApplication",
  "HealthApplication",
  "SecurityApplication",
  "UtilitiesApplication",
] as const

export function SoftwareApplicationSchemaGeneratorTool() {
  const [name, setName] = useState("My Startup")
  const [description, setDescription] = useState(
    "A concise description of what the product helps customers accomplish.",
  )
  const [url, setUrl] = useState("https://example.com")
  const [imageUrl, setImageUrl] = useState("")
  const [applicationCategory, setApplicationCategory] = useState(
    "BusinessApplication",
  )
  const [operatingSystem, setOperatingSystem] = useState("Web")
  const [price, setPrice] = useState("0")
  const [currency, setCurrency] = useState("USD")

  const json = useMemo(
    () =>
      generateSoftwareApplicationSchema({
        name,
        description,
        url,
        imageUrl,
        applicationCategory,
        operatingSystem,
        price,
        currency,
      }),
    [
      applicationCategory,
      currency,
      description,
      imageUrl,
      name,
      operatingSystem,
      price,
      url,
    ],
  )
  const script = wrapJsonLdInScriptTag(json)
  const requiredFields = [
    name,
    description,
    url,
    applicationCategory,
    operatingSystem,
  ]
  const completeCount = requiredFields.filter((value) => value.trim()).length
  const isComplete = completeCount === requiredFields.length

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="software-schema-inputs"
        title="Software details"
        description="Describe the application and its offer in a machine-readable format."
      >
        <div className="space-y-5">
          <ToolField htmlFor="software-name" label="Product name" required>
            <Input
              id="software-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
            />
          </ToolField>
          <ToolField
            htmlFor="software-description"
            label="Product description"
            hint={`${description.length}/300`}
            required
          >
            <Textarea
              id="software-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              className="min-h-28 border-slate-300 bg-white"
            />
          </ToolField>
          <ToolField htmlFor="software-url" label="Canonical URL" required>
            <Input
              id="software-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={inputClassName}
              placeholder="https://example.com"
            />
          </ToolField>
          <ToolField htmlFor="software-image" label="Product image URL">
            <Input
              id="software-image"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className={inputClassName}
              placeholder="https://example.com/product.png"
            />
          </ToolField>
          <div className="grid gap-5 sm:grid-cols-2">
            <ToolField
              htmlFor="software-category"
              label="Application category"
              required
            >
              <select
                id="software-category"
                value={applicationCategory}
                onChange={(event) => setApplicationCategory(event.target.value)}
                className={`${inputClassName} w-full rounded-md border px-3 text-sm outline-none`}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replace("Application", "")}
                  </option>
                ))}
              </select>
            </ToolField>
            <ToolField htmlFor="software-os" label="Operating system" required>
              <Input
                id="software-os"
                value={operatingSystem}
                onChange={(event) => setOperatingSystem(event.target.value)}
                className={inputClassName}
                placeholder="Web, iOS, Android"
              />
            </ToolField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <ToolField
              htmlFor="software-price"
              label="Starting price"
              hint="Use 0 for free"
            >
              <Input
                id="software-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={inputClassName}
              />
            </ToolField>
            <ToolField htmlFor="software-currency" label="Currency">
              <Input
                id="software-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className={inputClassName}
                maxLength={3}
                placeholder="USD"
              />
            </ToolField>
          </div>
        </div>
      </ToolPanel>

      <div className="space-y-6" aria-live="polite">
        <ToolPanel
          id="software-schema-summary"
          title="Markup summary"
          description="Check the key properties before adding the schema to your product page."
          action={
            <ToolStatusBadge tone={isComplete ? "good" : "warning"}>
              {isComplete ? "Ready to use" : "Needs details"}
            </ToolStatusBadge>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <ToolMetric
              label="Required fields"
              value={`${completeCount}/${requiredFields.length}`}
              detail="Name, description, URL, category, and OS"
            />
            <ToolMetric
              label="Offer"
              value={price === "0" ? "Free" : price || "Not set"}
              detail={price ? currency.toUpperCase() || "USD" : "Optional"}
            />
            <ToolMetric
              label="Schema type"
              value="Software"
              detail="SoftwareApplication"
            />
          </div>
        </ToolPanel>

        <ToolPanel
          id="software-schema-code"
          title="SoftwareApplication JSON-LD"
          description="Paste the script into the product page that describes this application."
          action={
            <DownloadTextButton
              content={json}
              filename="software-application-schema.json"
              label="Download JSON"
              mimeType="application/ld+json;charset=utf-8"
              disabled={!isComplete}
            />
          }
        >
          <CopyableCode code={script} label="JSON-LD script" />
        </ToolPanel>
      </div>
    </ToolWorkspaceGrid>
  )
}
