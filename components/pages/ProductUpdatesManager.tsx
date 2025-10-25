"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { useForm, FormProvider, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MoreHorizontal, Plus, RotateCcw, Save } from "lucide-react"

import {
  createProductUpdateAction,
  deleteProductUpdateAction,
  updateProductUpdateAction,
} from "@/actions/member/product-updates/actions"
import {
  productUpdateInputSchema,
  type ProductUpdateInput,
} from "@/lib/productUpdates/schema"
import type { ProductUpdateManageView } from "@/types/product-updates"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
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
import { Badge } from "@/components/atoms/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/atoms/dropdown-menu"
import { AlertModal } from "@/components/atoms/alert-modal"
import { MarkdownEditor } from "@/components/molecules/MarkdownEditor"

type ProductUpdatesManagerProps = {
  product: {
    id: string
    slug: string
    name: string
    createdAt: string
    updatedAt: string
    publicPath: string
  }
  initialUpdates: ProductUpdateManageView[]
}

type ProductUpdateFormValues = ProductUpdateInput & {
  summary?: string
}

const DEFAULT_VALUES: ProductUpdateFormValues = {
  title: "",
  summary: "",
  content: "",
  status: "published",
}

export function ProductUpdatesManager({
  product,
  initialUpdates,
}: ProductUpdatesManagerProps) {
  const [updates, setUpdates] = useState<ProductUpdateManageView[]>(
    () => initialUpdates ?? [],
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ProductUpdateFormValues>({
    resolver: zodResolver(productUpdateInputSchema) as any,
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  })

  const resetForm = useCallback(
    (nextStatus?: ProductUpdateFormValues["status"]) => {
      form.reset({
        ...DEFAULT_VALUES,
        status: nextStatus ?? DEFAULT_VALUES.status,
      })
      setEditingId(null)
    },
    [form],
  )

  const handleEdit = useCallback(
    (update: ProductUpdateManageView) => {
      setEditingId(update.id)
      form.reset({
        title: update.title,
        summary: update.summary ?? "",
        content: update.content,
        status: update.status,
      })
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    },
    [form],
  )

  const handleDelete = useCallback(
    (updateId: string) => {
      startTransition(() => {
        deleteProductUpdateAction(product.slug, updateId)
          .then((result) => {
            if (result?.error) {
              toast.error(result.error)
              return
            }

            setUpdates((prev) => prev.filter((item) => item.id !== updateId))
            if (editingId === updateId) {
              resetForm()
            }
            toast.success("Update removed from your changelog.")
          })
          .catch((error) => {
            console.error("[product-updates] deleteProductUpdateAction", error)
            toast.error(
              "Something went wrong while removing this update. Please try again.",
            )
          })
          .finally(() => {
            setDeleteTargetId(null)
          })
      })
    },
    [editingId, product.slug, resetForm],
  )

  const onSubmit = useCallback(
    (values: ProductUpdateFormValues) => {
      const payload: ProductUpdateFormValues = {
        ...values,
        title: values.title.trim(),
        content: values.content.trim(),
        summary:
          values.summary && values.summary.trim().length
            ? values.summary.trim()
            : undefined,
      }

      const action = editingId
        ? updateProductUpdateAction(product.slug, editingId, payload)
        : createProductUpdateAction(product.slug, payload)

      startTransition(() => {
        action
          .then((result) => {
            if (result?.error) {
              toast.error(result.error)
              return
            }

            if (!result?.update) {
              toast.error("No update returned from server.")
              return
            }

            const update = result.update
            setUpdates((prev) => {
              if (editingId) {
                return prev.map((item) =>
                  item.id === update.id ? update : item,
                )
              }
              return [update, ...prev]
            })

            const isPublished = update.status === "published"
            toast.success(
              editingId
                ? isPublished
                  ? "Update published."
                  : "Draft saved."
                : isPublished
                  ? "Update published to your changelog."
                  : "Draft saved for later.",
            )

            resetForm(update.status)
          })
          .catch((error) => {
            console.error("[product-updates] submitProductUpdate", error)
            toast.error(
              "We ran into an issue saving your update. Please try again.",
            )
          })
      })
    },
    [editingId, product.slug, resetForm],
  )

  const handleSubmit = useMemo(
    () => form.handleSubmit(onSubmit),
    [form, onSubmit],
  )

  const isEditing = editingId !== null
  const currentStatus: ProductUpdateFormValues["status"] =
    useWatch<ProductUpdateFormValues, "status">({
      control: form.control,
      name: "status",
    }) ?? DEFAULT_VALUES.status

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-0">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Product updates
          </h1>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <a href={product.publicPath} target="_blank" rel="noreferrer">
              View public page
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Keep your community in the loop with a running changelog for{" "}
          <span className="font-medium text-foreground">{product.name}</span>.
        </p>
      </header>

      <Card className="border border-border/80 bg-white/95 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-semibold">
            {isEditing ? "Edit update" : "Share a new update"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Adjust the title, summary, or details before saving again."
              : "Announce improvements, launches, or fixes. Published updates appear instantly on your public page."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="What shipped?"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Summary{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="One-line takeaway"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <MarkdownEditor
                        ref={field.ref}
                        value={(field.value as string) ?? ""}
                        onChange={(val) => field.onChange(val)}
                        onBlur={field.onBlur}
                        name={field.name}
                        placeholder="Use Markdown to highlight what's new for your users..."
                        disabled={isPending}
                        rows={10}
                        textareaClassName="min-h-[160px]"
                        previewClassName="min-h-[160px]"
                        toolbarClassName="justify-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-auto">
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="published">Publish now</SelectItem>
                          <SelectItem value="draft">Save as draft</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => resetForm(currentStatus)}
                      disabled={isPending}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Cancel edit
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="gap-2"
                  >
                    {isEditing ? (
                      <>
                        <Save className="h-4 w-4" />
                        Save changes
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {currentStatus === "draft"
                          ? "Save draft"
                          : "Publish update"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Recent updates
          </h2>
          <p className="text-sm text-muted-foreground">
            Drafts stay private until you publish them. Updates are ordered
            chronologically with the latest first.
          </p>
        </div>

        {updates.length === 0 ? (
          <Card className="border border-dashed border-border/70 bg-white/70 text-center shadow-none">
            <CardContent className="py-12">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t shared any updates yet. Draft your first
                changelog entry above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => {
              const publishedAt = update.publishedAt
                ? new Date(update.publishedAt)
                : null
              const updatedAt = new Date(update.updatedAt)
              const createdAt = new Date(update.createdAt)
              const authorLabel =
                update.author?.displayName ??
                ([update.author?.firstName, update.author?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                  null)

              return (
                <Card
                  key={update.id}
                  className={cn(
                    "border border-border/80 bg-white/95 shadow-sm transition",
                    editingId === update.id
                      ? "ring-brand-500/30 ring-2"
                      : undefined,
                  )}
                >
                  <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl font-semibold">
                          {update.title}
                        </CardTitle>
                        <Badge
                          variant={
                            update.status === "published"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {update.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Created {format(createdAt, "MMM d, yyyy")}</span>
                        <span>&middot;</span>
                        <span>
                          Updated{" "}
                          {formatDistanceToNow(updatedAt, { addSuffix: true })}
                        </span>
                        {publishedAt ? (
                          <>
                            <span>&middot;</span>
                            <span>
                              Published {format(publishedAt, "MMM d, yyyy")}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>&middot;</span>
                            <span>Draft only</span>
                          </>
                        )}
                        {authorLabel ? (
                          <>
                            <span>&middot;</span>
                            <span>By {authorLabel}</span>
                          </>
                        ) : null}
                      </div>
                      {update.summary ? (
                        <p className="text-sm text-muted-foreground">
                          {update.summary}
                        </p>
                      ) : null}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-9 w-9"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault()
                            handleEdit(update)
                          }}
                        >
                          Edit update
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertModal
                          title="Delete this update?"
                          description="This will permanently remove the update from your changelog."
                          confirmText="Delete"
                          loading={isPending && deleteTargetId === update.id}
                          onConfirm={() => {
                            setDeleteTargetId(update.id)
                            handleDelete(update.id)
                          }}
                          trigger={(open) => (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={(event) => {
                                event.preventDefault()
                                open()
                              }}
                            >
                              Delete update
                            </DropdownMenuItem>
                          )}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} unwrapDisallowed>
                      {update.content}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
