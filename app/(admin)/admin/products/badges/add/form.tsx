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
import { Button } from "@/components/atoms/button"
import PageContainer from "@/components/layout/page-container"
import { createBadge } from "@/actions/admin/badges/actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import {
  Flame,
  Star,
  Clock,
  Check,
  ArrowUp,
  Sparkles,
  Rocket,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"

const BADGE_COLORS = [
  "blue",
  "green",
  "yellow",
  "red",
  "purple",
  "orange",
  "pink",
  "teal",
  "cyan",
  "gray",
]

const BADGE_ICON_MAP = {
  flame: Flame,
  star: Star,
  clock: Clock,
  check: Check,
  "arrow-up": ArrowUp,
  sparkles: Sparkles,
  rocket: Rocket,
  tag: Tag,
}

const badgeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().optional(),
  description: z.string().optional(),
})

type BadgeFormInput = z.infer<typeof badgeFormSchema>

export default function AddBadgeForm() {
  const router = useRouter()

  const form = useForm<BadgeFormInput>({
    resolver: zodResolver(badgeFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      color: "",
      icon: "",
      description: "",
    },
  })

  async function onSubmit(values: BadgeFormInput) {
    try {
      await createBadge(values)
      router.push("/admin/products/badges")
    } catch (error) {
      form.setError("name", {
        type: "server",
        message: error?.message || "Something went wrong",
      })
    }
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add Badge
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Create a new badge to assign to products.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Editor’s Pick" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="slug"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="editors-pick" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="color"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BADGE_COLORS.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="icon"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BADGE_ICON_MAP).map(([key, Icon]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {key}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input
                        placeholder="Displayed on hover or detail view"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Create Badge
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
