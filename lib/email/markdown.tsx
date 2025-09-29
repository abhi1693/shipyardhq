/* eslint-disable @next/next/no-img-element */
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import type { Components, ExtraProps } from "react-markdown"
import remarkGfm from "remark-gfm"

export const EMAIL_PARAGRAPH_STYLE: CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
}

const headingBaseStyle: CSSProperties = {
  color: "#0f172a",
  lineHeight: "1.2",
  margin: "24px 0 12px",
}

const HEADING_STYLES: Record<string, CSSProperties> = {
  h1: { ...headingBaseStyle, fontSize: "28px", fontWeight: 700, marginTop: "0" },
  h2: { ...headingBaseStyle, fontSize: "24px", fontWeight: 700 },
  h3: { ...headingBaseStyle, fontSize: "20px", fontWeight: 600 },
  h4: { ...headingBaseStyle, fontSize: "18px", fontWeight: 600 },
  h5: { ...headingBaseStyle, fontSize: "16px", fontWeight: 600 },
  h6: { ...headingBaseStyle, fontSize: "15px", fontWeight: 600, textTransform: "uppercase" },
}

const LIST_STYLE: CSSProperties = {
  ...EMAIL_PARAGRAPH_STYLE,
  paddingLeft: "20px",
  margin: "0 0 16px",
}

const LIST_ITEM_STYLE: CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  marginBottom: "8px",
  color: "#1f2937",
}

const LINK_STYLE: CSSProperties = {
  color: "#2563eb",
  textDecoration: "underline",
}

const BLOCKQUOTE_STYLE: CSSProperties = {
  ...EMAIL_PARAGRAPH_STYLE,
  borderLeft: "4px solid #2563eb",
  paddingLeft: "16px",
  color: "#111827",
  fontStyle: "italic",
}

const INLINE_CODE_STYLE: CSSProperties = {
  backgroundColor: "#f1f5f9",
  borderRadius: "4px",
  padding: "2px 4px",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: "14px",
  color: "#0f172a",
}

const PRE_STYLE: CSSProperties = {
  backgroundColor: "#0f172a",
  color: "#f8fafc",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: "22px",
  overflowX: "auto",
}

const CODE_BLOCK_STYLE: CSSProperties = {
  display: "block",
  whiteSpace: "pre",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
}

const HR_STYLE: CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0",
}

const TABLE_STYLE: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: "16px",
}

const TABLE_CELL_STYLE: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "8px 12px",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "left",
}

const IMAGE_STYLE: CSSProperties = {
  maxWidth: "100%",
  borderRadius: "8px",
  margin: "0 0 16px",
}

function mergeStyles(base: CSSProperties, style?: CSSProperties): CSSProperties {
  return style ? { ...base, ...style } : { ...base }
}

type CodeComponentProps = ComponentPropsWithoutRef<"code"> &
  ExtraProps & {
    inline?: boolean
  }

const emailMarkdownComponents: Components = {
  p: ({ children, style, ...props }) => (
    <p
      {...props}
      style={mergeStyles(EMAIL_PARAGRAPH_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </p>
  ),
  a: ({ children, href, style, ...props }) => (
    <a
      {...props}
      href={href ?? "#"}
      style={mergeStyles(LINK_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </a>
  ),
  ul: ({ children, style, ...props }) => (
    <ul
      {...props}
      style={mergeStyles(LIST_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </ul>
  ),
  ol: ({ children, style, ...props }) => (
    <ol
      {...props}
      style={mergeStyles(LIST_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </ol>
  ),
  li: ({ children, style, ...props }) => (
    <li
      {...props}
      style={mergeStyles(LIST_ITEM_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </li>
  ),
  blockquote: ({ children, style, ...props }) => (
    <blockquote
      {...props}
      style={mergeStyles(BLOCKQUOTE_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </blockquote>
  ),
  code: ({ inline, children, style, ...props }: CodeComponentProps) => {
    if (inline) {
      return (
        <code
          {...props}
          style={mergeStyles(INLINE_CODE_STYLE, style as CSSProperties | undefined)}
        >
          {children}
        </code>
      )
    }

    return (
      <code
        {...props}
        style={mergeStyles(CODE_BLOCK_STYLE, style as CSSProperties | undefined)}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, style, ...props }) => (
    <pre
      {...props}
      style={mergeStyles(PRE_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </pre>
  ),
  hr: ({ style, ...props }) => (
    <hr
      {...props}
      style={mergeStyles(HR_STYLE, style as CSSProperties | undefined)}
    />
  ),
  table: ({ children, style, ...props }) => (
    <table
      {...props}
      style={mergeStyles(TABLE_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </table>
  ),
  thead: ({ children, style, ...props }) => (
    <thead
      {...props}
      style={mergeStyles(
        { backgroundColor: "#f8fafc" },
        style as CSSProperties | undefined,
      )}
    >
      {children}
    </thead>
  ),
  th: ({ children, style, ...props }) => (
    <th
      {...props}
      style={mergeStyles(
        { ...TABLE_CELL_STYLE, fontWeight: 600 },
        style as CSSProperties | undefined,
      )}
    >
      {children}
    </th>
  ),
  td: ({ children, style, ...props }) => (
    <td
      {...props}
      style={mergeStyles(TABLE_CELL_STYLE, style as CSSProperties | undefined)}
    >
      {children}
    </td>
  ),
  img: ({ style, alt, ...props }) => (
    <img
      {...props}
      alt={typeof alt === "string" ? alt : ""}
      style={mergeStyles(IMAGE_STYLE, style as CSSProperties | undefined)}
    />
  ),
  h1: ({ children, style, ...props }) => (
    <h1
      {...props}
      style={mergeStyles(HEADING_STYLES.h1, style as CSSProperties | undefined)}
    >
      {children}
    </h1>
  ),
  h2: ({ children, style, ...props }) => (
    <h2
      {...props}
      style={mergeStyles(HEADING_STYLES.h2, style as CSSProperties | undefined)}
    >
      {children}
    </h2>
  ),
  h3: ({ children, style, ...props }) => (
    <h3
      {...props}
      style={mergeStyles(HEADING_STYLES.h3, style as CSSProperties | undefined)}
    >
      {children}
    </h3>
  ),
  h4: ({ children, style, ...props }) => (
    <h4
      {...props}
      style={mergeStyles(HEADING_STYLES.h4, style as CSSProperties | undefined)}
    >
      {children}
    </h4>
  ),
  h5: ({ children, style, ...props }) => (
    <h5
      {...props}
      style={mergeStyles(HEADING_STYLES.h5, style as CSSProperties | undefined)}
    >
      {children}
    </h5>
  ),
  h6: ({ children, style, ...props }) => (
    <h6
      {...props}
      style={mergeStyles(HEADING_STYLES.h6, style as CSSProperties | undefined)}
    >
      {children}
    </h6>
  ),
}

export function renderEmailMarkdown(message: string): ReactNode {
  const trimmed = message.trim()
  if (!trimmed) {
    return null
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={emailMarkdownComponents}
      skipHtml
    >
      {trimmed}
    </ReactMarkdown>
  )
}

export function markdownToPlainText(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) {
    return ""
  }

  let text = trimmed

  text = text.replace(/```[\s\S]*?```/g, (block) => {
    const cleaned = block
      .replace(/```[a-zA-Z0-9]*\n?/g, "")
      .replace(/```/g, "")
      .trimEnd()
    return `\n${cleaned.trim()}\n`
  })
  text = text.replace(/`([^`]+)`/g, "$1")
  text = text.replace(/\*\*(.*?)\*\*/g, "$1")
  text = text.replace(/__(.*?)__/g, "$1")
  text = text.replace(/\*(.*?)\*/g, "$1")
  text = text.replace(/_(.*?)_/g, "$1")
  text = text.replace(/~~(.*?)~~/g, "$1")
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
  text = text.replace(/^>\s?/gm, "")
  text = text.replace(/^#{1,6}\s+/gm, "")
  text = text.replace(/^\s*-{3,}\s*$/gm, "")
  text = text.replace(/^\s*\*{3,}\s*$/gm, "")
  text = text.replace(/\r/g, "")

  return text.trim()
}

export function getEmailPreviewText(message: string): string | undefined {
  const plain = markdownToPlainText(message)
  const collapsed = plain.replace(/\s+/g, " ").trim()
  return collapsed ? collapsed.slice(0, 140) : undefined
}
