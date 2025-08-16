"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import SaveButton from "@/components/molecules/SaveButton"
import PageContainer from "@/components/layout/page-container"
import { Separator } from "@/components/atoms/separator"
import { Textarea } from "@/components/atoms/textarea"
import { updateProductAction } from "@/actions/admin/products/actions"
import {
  CURRENCIES,
  CURRENCY_CODES,
  PLATFORMS,
  type PlatformCode,
} from "@/lib/constants"
import type {
  Product,
  ProductMetadata,
  ProductVerification,
  ProductAnalytics,
  Category,
  User,
  Organization,
} from "@prisma/client"

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tagline: z.string().min(1, "Tagline is required"),
  description: z.string().min(1, "Description is required"),
  websiteUrl: z.url("Valid URL required"),
  logo: z.string().min(1, "Logo is required"),
  bannerImage: z.url().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
  userId: z.string().min(1, "User is required"),
  organizationId: z.string().optional().or(z.literal("")),
  type: z.enum([
    "saas",
    "browser_extension",
    "mobile_app",
    "desktop_app",
    "api",
    "open_source",
    "other",
  ]),
  pricingModel: z.enum([
    "free",
    "freemium",
    "subscription",
    "one_time",
    "custom",
  ]),
  status: z.enum(["draft", "published", "archived"]),
  startingPriceCents: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || v >= 0, "Must be >= 0"),
  currencyCode: z.enum(CURRENCY_CODES),
  ctaLabel: z.string().optional().or(z.literal("")),
  ctaUrl: z.string().url().or(z.literal("")),
  keywords: z.string().optional().or(z.literal("")),
  platforms: z.array(z.enum(PLATFORMS)).optional(),
  githubUrl: z.string().optional().or(z.literal("")),
  twitterUrl: z.string().optional().or(z.literal("")),
  demoUrl: z.string().optional().or(z.literal("")),
  contactEmail: z.string().optional().or(z.literal("")),
})

type ProductFormInput = z.infer<typeof productFormSchema>

export default function EditProductForm({
  product,
  categories,
  users,
  organizations,
}: {
  product: Product & {
    metadata: ProductMetadata | null
    verification: ProductVerification | null
    analytics: ProductAnalytics | null
    category: Category
    user: User
    organization: Organization | null
  }
  categories: { id: string; name: string }[]
  users: { id: string; email: string }[]
  organizations: { id: string; name: string }[]
}) {
  const router = useRouter()

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      websiteUrl: product.websiteUrl,
      logo: product.logo,
      bannerImage: product.bannerImage || "",
      categoryId: product.categoryId,
      userId: product.userId,
      organizationId: product.organizationId || "",
      type: product.type,
      pricingModel: product.pricingModel,
      status: (product.status as any) || "published",
      startingPriceCents:
        product.startingPriceCents != null
          ? String(product.startingPriceCents)
          : undefined,
      currencyCode: product.currencyCode || "USD",
      ctaLabel: product.ctaLabel || "",
      ctaUrl: product.ctaUrl || "",
      keywords: (product.keywords || []).join(", "),
      platforms: (product.platforms as any) || [],
      githubUrl: product.metadata?.githubUrl || "",
      twitterUrl: product.metadata?.twitterUrl || "",
      demoUrl: product.metadata?.demoUrl || "",
      contactEmail: product.metadata?.contactEmail || "",
    },
  })

  async function onSubmit(values: ProductFormInput) {
    const keywords = (values.keywords || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const result = await updateProductAction(product.id, {
      name: values.name,
      categoryId: values.categoryId,
      userId: values.userId,
      description: values.description,
      tagline: values.tagline,
      websiteUrl: values.websiteUrl,
      logo: values.logo,
      type: values.type as any,
      pricingModel: values.pricingModel as any,
      organizationId: values.organizationId || null,
      status: values.status,
      startingPriceCents: values.startingPriceCents ?? null,
      currencyCode: values.currencyCode || null,
      ctaLabel: values.ctaLabel || null,
      ctaUrl: values.ctaUrl || null,
      bannerImage: values.bannerImage || null,
      keywords,
      platforms: (values.platforms || []) as any,
      githubUrl: values.githubUrl || null,
      twitterUrl: values.twitterUrl || null,
      demoUrl: values.demoUrl || null,
      contactEmail: values.contactEmail || null,
    })

    if ((result as any)?.error) return

    router.push("/admin/products/" + product.id)
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Product
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Update product details, pricing, and metadata.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Required */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="tagline"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl>
                        <Input placeholder="Short tagline" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="websiteUrl"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="logo"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/logo.png"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="categoryId"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="userId"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="organizationId"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization (optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            "saas",
                            "browser_extension",
                            "mobile_app",
                            "desktop_app",
                            "api",
                            "open_source",
                            "other",
                          ].map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace(/_/g, " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="pricingModel"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Model</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pricing model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            "free",
                            "freemium",
                            "subscription",
                            "one_time",
                            "custom",
                          ].map((model) => (
                            <SelectItem key={model} value={model}>
                              {model.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["draft", "published", "archived"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-4" />

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  name="startingPriceCents"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Price (cents)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="e.g. 1900"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="currencyCode"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="ctaLabel"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Get Started" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="ctaUrl"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/signup"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Branding */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="bannerImage"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner Image</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/banner.png"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Platforms & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="platforms"
                  control={form.control}
                  render={() => (
                    <FormItem>
                      <FormLabel>Platforms</FormLabel>
                      <div className="flex flex-wrap gap-3">
                        {PLATFORMS.map((p: PlatformCode) => (
                          <label
                            key={p}
                            className="inline-flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="accent-foreground"
                              checked={(
                                (form.getValues("platforms") ||
                                  []) as PlatformCode[]
                              ).includes(p)}
                              onChange={(e) => {
                                const selected = (form.getValues("platforms") ||
                                  []) as PlatformCode[]
                                const current = new Set<PlatformCode>(selected)
                                if (e.target.checked) current.add(p)
                                else current.delete(p)
                                form.setValue("platforms", Array.from(current))
                              }}
                            />
                            {p.replaceAll("_", " ")}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="keywords"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma-separated)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="saas, productivity, ai"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Optional Links */}
              <FormField
                name="githubUrl"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://github.com/org/repo"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="twitterUrl"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://twitter.com/yourapp"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="demoUrl"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Demo URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://demo.example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="contactEmail"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="support@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <SaveButton
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  Save Changes
                </SaveButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
