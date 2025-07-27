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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import PageContainer from "@/components/layout/page-container"
import { assignBadgeToProduct } from "@/actions/admin/badges/actions"

const schema = z.object({
  productId: z.string().min(1, "Product is required"),
  badgeId: z.string().min(1, "Badge is required"),
  expiresAt: z.string().optional(),
})

type FormInput = z.infer<typeof schema>

export default function AssignProductBadgeForm({
  products,
  badges,
}: {
  products: { id: string; name: string }[]
  badges: { id: string; name: string }[]
}) {
  const router = useRouter()
  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: "",
      badgeId: "",
      expiresAt: "",
    },
  })

  async function onSubmit(values: FormInput) {
    try {
      await assignBadgeToProduct({
        productId: values.productId,
        badgeId: values.badgeId,
        expiresAt: values.expiresAt ? new Date(values.expiresAt) : undefined,
      })
      router.push("/admin/products/assignments/badges")
    } catch (error) {
      form.setError("badgeId", {
        type: "server",
        message: "Failed to assign badge",
      })
    }
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Assign Badge to Product
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose a product and a badge to create the assignment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                name="productId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="badgeId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Badge</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a badge" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {badges.map((badge) => (
                          <SelectItem key={badge.id} value={badge.id}>
                            {badge.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="expiresAt"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Assign Badge
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
