"use client"

import { forwardRef, useState, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"
import type { PluggableList } from "unified"

import { Textarea } from "@/components/atoms/textarea"
import { cn } from "@/lib/utils"

type MarkdownEditorProps = {
  value: string | null | undefined
  onChange: (value: string) => void
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>
  name?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  rows?: number
  className?: string
  textareaClassName?: string
  previewClassName?: string
  toolbarClassName?: string
  toolbarLeft?: ReactNode
  disallowedElements?: string[]
  remarkPlugins?: PluggableList
  markdownComponents?: Components
}

const defaultRemarkPlugins: PluggableList = [remarkGfm]

const defaultMarkdownComponents: Components = {
  a: ({ className, ...props }) => (
    <a
      {...props}
      className={cn("underline", className)}
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
}

const defaultDisallowedElements = ["h1"]

const MarkdownEditor = forwardRef<HTMLTextAreaElement, MarkdownEditorProps>(
  (
    {
      value,
      onChange,
      onBlur,
      name,
      id,
      placeholder,
      disabled = false,
      rows = 10,
      className,
      textareaClassName,
      previewClassName,
      disallowedElements = defaultDisallowedElements,
      remarkPlugins,
      markdownComponents,
      toolbarClassName,
      toolbarLeft,
    },
    ref,
  ) => {
    const [mode, setMode] = useState<"write" | "preview">("write")
    const content = value ?? ""

    return (
      <div className={cn("space-y-2", className)}>
        <div
          className={cn(
            "flex items-center gap-2 text-xs",
            toolbarLeft ? "justify-between" : "justify-end",
            toolbarClassName,
          )}
        >
          {toolbarLeft ? <div>{toolbarLeft}</div> : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                "rounded border px-2 py-1 transition",
                mode === "write" ? "bg-muted text-foreground" : "opacity-60",
              )}
              onClick={() => setMode("write")}
              aria-pressed={mode === "write"}
            >
              Write
            </button>
            <button
              type="button"
              className={cn(
                "rounded border px-2 py-1 transition",
                mode === "preview" ? "bg-muted text-foreground" : "opacity-60",
              )}
              onClick={() => setMode("preview")}
              aria-pressed={mode === "preview"}
            >
              Preview
            </button>
          </div>
        </div>

        {mode === "write" ? (
          <Textarea
            id={id}
            name={name}
            value={content}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            ref={ref}
            className={cn("min-h-[160px]", textareaClassName)}
          />
        ) : (
          <div
            className={cn(
              "prose prose-sm w-full max-w-full !max-w-none rounded border border-border p-3 text-muted-foreground",
              "min-h-[160px] overflow-auto",
              previewClassName,
            )}
          >
            <ReactMarkdown
              remarkPlugins={remarkPlugins ?? defaultRemarkPlugins}
              components={markdownComponents ?? defaultMarkdownComponents}
              disallowedElements={disallowedElements}
              unwrapDisallowed
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    )
  },
)

MarkdownEditor.displayName = "MarkdownEditor"

export { MarkdownEditor }
