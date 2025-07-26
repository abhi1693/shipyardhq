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
import { Button } from "@/components/atoms/button"
import PageContainer from "@/components/layout/page-container"
import { Separator } from "@/components/atoms/separator"
import { toast } from "sonner"
import { createProductAction } from "@/actions/admin/products/actions"

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tagline: z.string().min(1, "Tagline is required"),
  websiteUrl: z.url("Valid URL required"),
  logo: z.string().min(1, "Logo URL is required"),
  categoryId: z.string().min(1, "Category is required"),
  githubUrl: z.url().or(z.literal("")).optional(),
  twitterUrl: z.url().or(z.literal("")).optional(),
  demoUrl: z.url().or(z.literal("")).optional(),
  contactEmail: z.email().or(z.literal("")).optional(),
})

type ProductFormInput = z.infer<typeof productFormSchema>

export default function AddProductForm({
  categories = [],
  userId,
}: {
  categories: { id: string; name: string }[]
  userId: string
}) {
  const router = useRouter()

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      tagline: "",
      websiteUrl: "",
      logo: "",
      categoryId: "",
      githubUrl: "",
      twitterUrl: "",
      demoUrl: "",
      contactEmail: "",
    },
  })

  async function onSubmit(values: ProductFormInput) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) {
      if (value) formData.append(key, value)
    }

    formData.append("userId", userId)
    const result = await createProductAction(formData)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success("Product created")
    router.push("/member/products")
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add Product
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Fill in the required and optional metadata to list your product.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <FormLabel>Logo URL</FormLabel>
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
              </div>

              <Separator className="my-4" />

              {/* Optional fields */}
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Create Product
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
