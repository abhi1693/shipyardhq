"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  createAlternativeProductAction,
  updateAlternativeProductAction,
} from "@/actions/admin/alternative-products/actions"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { Checkbox } from "@/components/atoms/checkbox"
import { Button } from "@/components/atoms/button"
import PageContainer from "@/components/layout/page-container"
import { adminPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z
    .string()
    .min(10, "Description should provide a helpful summary"),
  websiteUrl: z.string().url("Enter a valid website URL"),
  logoUrl: z.string().url("Enter a valid logo URL"),
  categoryIds: z.array(z.string()).default([]),
  productIds: z.array(z.string()).default([]),
})

export type AlternativeProductFormInput = z.infer<typeof schema>

type Option = { id: string; name: string; slug?: string }

interface AlternativeProductFormProps {
  mode: "create" | "edit"
  alternativeId?: string
  defaultValues?: Partial<AlternativeProductFormInput>
  categories: Option[]
  products: Option[]
}

export function AlternativeProductForm({
  mode,
  alternativeId,
  defaultValues,
  categories,
  products,
}: AlternativeProductFormProps) {
  const router = useRouter()
  const [categoryQuery, setCategoryQuery] = useState("")
  const [productQuery, setProductQuery] = useState("")

  const form = useForm<AlternativeProductFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      websiteUrl: "",
      logoUrl: "",
      categoryIds: [],
      productIds: [],
      ...defaultValues,
    },
  })

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase()
    if (!query) return categories
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query),
    )
  }, [categories, categoryQuery])

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) => {
      const label = `${product.name} ${product.slug ?? ""}`.toLowerCase()
      return label.includes(query)
    })
  }, [products, productQuery])

  async function onSubmit(values: AlternativeProductFormInput) {
    if (mode === "create") {
      const formData = new FormData()
      formData.append("name", values.name)
      formData.append("description", values.description)
      formData.append("websiteUrl", values.websiteUrl)
      formData.append("logoUrl", values.logoUrl)
      values.categoryIds.forEach((categoryId) =>
        formData.append("categoryIds", categoryId),
      )
      values.productIds.forEach((productId) =>
        formData.append("productIds", productId),
      )

      const result = await createAlternativeProductAction(formData)

      if (result?.error) {
        const message = result.error
        if (message.toLowerCase().includes("website")) {
          form.setError("websiteUrl", {
            type: "server",
            message,
          })
        } else {
          form.setError("name", {
            type: "server",
            message,
          })
        }
        return
      }

      toast.success("Alternative product created")
      router.push(adminPath("alternatives"))
      return
    }

    if (!alternativeId) {
      toast.error("Missing alternative ID")
      return
    }

    const result = await updateAlternativeProductAction(alternativeId, values)

    if (result?.error) {
      const message = result.error
      if (message.toLowerCase().includes("website")) {
        form.setError("websiteUrl", {
          type: "server",
          message,
        })
      } else {
        form.setError("name", {
          type: "server",
          message,
        })
      }
      return
    }

    toast.success("Alternative product updated")
    router.push(adminPath("alternatives", alternativeId))
  }

  const selectedCategoryIds =
    useWatch({ control: form.control, name: "categoryIds" }) ?? []
  const selectedProductIds =
    useWatch({ control: form.control, name: "productIds" }) ?? []

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            {mode === "create" ? "Add Alternative Product" : "Edit Alternative"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Maintain a curated list of third-party tools customers compare
            against our featured products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Notion" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short summary that helps the team understand positioning"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="websiteUrl"
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
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://cdn.example.com/logo.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="categoryIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Categories{" "}
                      <span className="text-xs text-muted-foreground">
                        ({selectedCategoryIds.length} selected)
                      </span>
                    </FormLabel>
                    <FormDescription>
                      Pick every Shipyard category where this alternative is a
                      relevant competitor.
                    </FormDescription>
                    <Input
                      value={categoryQuery}
                      onChange={(event) => setCategoryQuery(event.target.value)}
                      placeholder="Filter categories"
                      className="mt-2"
                    />
                    <div className="mt-3 max-h-60 space-y-2 overflow-y-auto rounded-md border border-dashed border-border/60 p-3">
                      {filteredCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No categories match your search.
                        </p>
                      ) : (
                        filteredCategories.map((category) => {
                          const isSelected = field.value?.includes(category.id)
                          return (
                            <label
                              key={category.id}
                              className={cn(
                                "flex cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-1 text-sm transition",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "hover:border-border hover:bg-muted/50",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const next = Array.isArray(field.value)
                                      ? [...field.value]
                                      : []
                                    if (checked) {
                                      if (!next.includes(category.id)) {
                                        next.push(category.id)
                                      }
                                    } else {
                                      const index = next.indexOf(category.id)
                                      if (index !== -1) {
                                        next.splice(index, 1)
                                      }
                                    }
                                    field.onChange(next)
                                  }}
                                />
                                <span>{category.name}</span>
                              </div>
                            </label>
                          )
                        })
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Shipyard Products{" "}
                      <span className="text-xs text-muted-foreground">
                        ({selectedProductIds.length} linked)
                      </span>
                    </FormLabel>
                    <FormDescription>
                      Attach every product in our directory that positions this
                      alternative as a competitor.
                    </FormDescription>
                    <Input
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                      placeholder="Search products"
                      className="mt-2"
                    />
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-md border border-dashed border-border/60 p-3">
                      {filteredProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No products match your search.
                        </p>
                      ) : (
                        filteredProducts.map((product) => {
                          const isSelected = field.value?.includes(product.id)
                          return (
                            <label
                              key={product.id}
                              className={cn(
                                "flex cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-1 text-sm transition",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "hover:border-border hover:bg-muted/50",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const next = Array.isArray(field.value)
                                      ? [...field.value]
                                      : []
                                    if (checked) {
                                      if (!next.includes(product.id)) {
                                        next.push(product.id)
                                      }
                                    } else {
                                      const index = next.indexOf(product.id)
                                      if (index !== -1) {
                                        next.splice(index, 1)
                                      }
                                    }
                                    field.onChange(next)
                                  }}
                                />
                                <span>
                                  {product.name}
                                  {product.slug ? (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {product.slug}
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            </label>
                          )
                        })
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(adminPath("alternatives"))}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : mode === "create"
                      ? "Create Alternative"
                      : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
