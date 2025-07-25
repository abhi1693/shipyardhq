"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { updateProductAction } from "@/actions/admin/products/actions"
import { Product } from "@prisma/client"

import {
  Card,
  CardContent,
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
import { Button } from "@/components/atoms/button"
import PageContainer from "@/components/layout/page-container"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  userId: z.string().min(1, "User is required"),
})

type ProductFormInput = z.infer<typeof productFormSchema>

export default function EditProductForm({
  product,
  categories,
  users,
}: {
  product: Product & {
    categoryId: string
    userId: string
  }
  categories: { id: string; name: string }[]
  users: { id: string; email: string }[]
}) {
  const router = useRouter()

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product.name,
      categoryId: product.categoryId,
      userId: product.userId,
    },
  })

  async function onSubmit(values: ProductFormInput) {
    const result = await updateProductAction(product.id, values)

    if ("error" in result) {
      form.setError("name", {
        type: "server",
        message: result.error,
      })
      return
    }

    router.push(`/admin/products/${product.id}`)
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
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
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
