import NextImage, { type ImageProps as NextImageProps } from "next/image"

const DEFAULT_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZWVlZWVlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIHJ4PSIwLjIiLz48L3N2Zz4="

type Props = Omit<NextImageProps, "placeholder" | "priority"> & {
  /**
   * Optional art-directed sources rendered as <source> inside a <picture>.
   */
  sources?: Array<{
    media?: string
    srcSet: string
    sizes?: string
    type?: string
  }>
  /**
   * Optional blur data to use when placeholder='blur'. Falls back to a tiny gray
   * data URI so remote assets still get a blur effect.
   */
  blurDataURL?: string
  /**
   * Explicit placeholder override. Defaults to blur when not eager.
   */
  placeholder?: Extract<NextImageProps["placeholder"], "blur" | "empty">
  /**
   * Override for blur fallback.
   */
  fallbackBlurDataURL?: string
  /**
   * Convenience flag to set eager loading + high fetch priority without using
   * the deprecated Next.js `priority` prop.
   */
  eager?: boolean
}

export function Image({
  alt = "",
  eager = false,
  loading,
  fetchPriority,
  placeholder,
  blurDataURL,
  fallbackBlurDataURL = DEFAULT_BLUR_DATA_URL,
  sources,
  ...props
}: Props) {
  const hasSources = Array.isArray(sources) && sources.length > 0
  const shouldEager = eager || loading === "eager" || fetchPriority === "high"
  const resolvedLoading = shouldEager ? "eager" : loading ?? "lazy"
  const resolvedFetchPriority =
    fetchPriority ?? (shouldEager ? ("high" as const) : ("auto" as const))
  const resolvedPlaceholder =
    placeholder ?? (!shouldEager ? ("blur" as const) : "empty")
  const resolvedBlur =
    resolvedPlaceholder === "blur"
      ? blurDataURL || fallbackBlurDataURL
      : undefined

  const imageNode = (
    <NextImage
      {...props}
      alt={alt}
      loading={resolvedLoading}
      fetchPriority={resolvedFetchPriority}
      placeholder={resolvedPlaceholder}
      blurDataURL={resolvedBlur}
    />
  )

  if (!hasSources) return imageNode

  return (
    <picture>
      {sources?.map((source, index) => (
        <source key={index} {...source} />
      ))}
      {imageNode}
    </picture>
  )
}
