"use client"

import { useEffect, useRef, useState } from "react"

import { claimAdDocument } from "@/lib/ads/document"
import { CARBON_ATTRIBUTION_URL } from "@/lib/ads/config"
import { fetchCarbonAd, type CarbonCreative } from "@/lib/ads/creative"
import { cn } from "@/lib/utils"
import { isCarbonDiscoveryPath } from "@/lib/ads/placement"

function Creative({
  ad,
  template,
}: {
  ad: CarbonCreative
  template: "sidebar" | "feed"
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [imageReady, setImageReady] = useState(ad.visual.kind === "text")

  useEffect(() => {
    if (!ad.viewUrl || !imageReady || !ref.current) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let recorded = false
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
        )
        if (!visible) {
          clearTimeout(timer)
          timer = undefined
        } else if (!timer && !recorded) {
          timer = setTimeout(() => {
            recorded = true
            observer.disconnect()
            void fetch(ad.viewUrl!, {
              mode: "no-cors",
              credentials: "omit",
              cache: "no-store",
            }).catch(() => {})
          }, 1000)
        }
      },
      { threshold: [0, 0.5] },
    )
    observer.observe(ref.current)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [ad.viewUrl, imageReady])

  return (
    <div
      ref={ref}
      className="shipyard-carbon-card"
      data-carbon-creative={ad.visual.kind}
      data-carbon-feed-creative={template === "feed" ? "" : undefined}
    >
      <a
        className="shipyard-carbon-creative"
        href={ad.link}
        target="_blank"
        rel="sponsored noopener noreferrer"
      >
        {ad.visual.kind === "rich" ? (
          <CreativeImage
            src={ad.visual.largeImage}
            width={100}
            height={100}
            onLoad={() => setImageReady(true)}
          />
        ) : ad.visual.kind === "image-text" ? (
          <CreativeImage
            src={ad.visual.smallImage}
            width={130}
            height={100}
            onLoad={() => setImageReady(true)}
          />
        ) : ad.visual.kind === "native-icon" ? (
          <CreativeImage
            src={ad.visual.image}
            width={40}
            height={40}
            backgroundColor={ad.backgroundColor}
            onLoad={() => setImageReady(true)}
          />
        ) : ad.visual.kind === "logo-text" ? (
          <CreativeImage
            src={ad.visual.logo}
            width={125}
            height={50}
            backgroundColor={ad.backgroundColor}
            onLoad={() => setImageReady(true)}
          />
        ) : null}
        <span className="shipyard-carbon-copy">
          {ad.visual.kind === "rich" ? (
            <span className="shipyard-carbon-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="shipyard-carbon-logo"
                src={ad.visual.logo}
                alt=""
                width={125}
                height={50}
                style={{ backgroundColor: ad.backgroundColor }}
              />
              <span className="shipyard-carbon-brand-copy">
                <span className="shipyard-carbon-company">{ad.company}</span>
                <span className="shipyard-carbon-tagline">
                  {ad.visual.tagline}
                </span>
              </span>
            </span>
          ) : ad.company ? (
            <span className="shipyard-carbon-company">{ad.company}</span>
          ) : null}
          <span className="shipyard-carbon-description">{ad.description}</span>
          {template === "sidebar" && ad.callToAction ? (
            <span className="shipyard-carbon-cta">{ad.callToAction}</span>
          ) : null}
        </span>
      </a>
      <div className="shipyard-carbon-footer">
        {template === "feed" && ad.callToAction ? (
          <a
            className="shipyard-carbon-cta"
            href={ad.link}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            {ad.callToAction}
          </a>
        ) : null}
        <span>Sponsored</span>
        <a
          href={CARBON_ATTRIBUTION_URL}
          target="_blank"
          rel="sponsored noopener noreferrer"
        >
          ads via Carbon
        </a>
      </div>
      {ad.pixels.map((pixel, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${index}-${pixel}`}
          src={pixel}
          alt=""
          width={1}
          height={1}
          hidden
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

type CarbonSlotProps = {
  pathname: string
  template: "sidebar" | "feed"
  section?: string
  className?: string
}

export function CarbonAdSlot({
  pathname,
  template,
  section,
  className,
}: CarbonSlotProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [ad, setAd] = useState<CarbonCreative | null>()
  const eligible = Boolean(pathname && isCarbonDiscoveryPath(pathname))

  useEffect(() => {
    const container = ref.current
    if (!container || !eligible) return
    let started = false
    const controller = new AbortController()
    const load = () => {
      if (
        started ||
        !container.getBoundingClientRect().width ||
        !isCarbonDiscoveryPath(location.pathname) ||
        !claimAdDocument("carbon")
      )
        return
      started = true
      observer.disconnect()
      void fetchCarbonAd(controller.signal, template)
        .then((creative) => {
          if (!controller.signal.aborted) setAd(creative)
        })
        .catch(() => {
          if (!controller.signal.aborted) setAd(null)
        })
    }
    const observer = new ResizeObserver(load)
    observer.observe(container)
    const timer = setTimeout(load, 0)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
      controller.abort()
    }
  }, [eligible, pathname, template])

  if (!eligible || ad === null) return null
  return (
    <div
      ref={ref}
      className={cn(
        "hidden w-full text-left xl:block",
        template === "sidebar"
          ? "min-h-[155px] max-w-[400px]"
          : "min-h-[106px]",
        className,
      )}
      data-carbon-template={template}
      data-carbon-placement
      data-carbon-section={section}
      aria-label="Advertisement via Carbon"
    >
      {ad ? <Creative ad={ad} template={template} /> : null}
    </div>
  )
}

function CreativeImage({
  src,
  width,
  height,
  backgroundColor,
  onLoad,
}: {
  src: string
  width: number
  height: number
  backgroundColor?: string
  onLoad: () => void
}) {
  return (
    // Ad assets go directly to the vendor, not through Next's image proxy.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="shipyard-carbon-image"
      src={src}
      alt="Advertisement"
      width={width}
      height={height}
      style={{ backgroundColor }}
      onLoad={onLoad}
    />
  )
}

export function CarbonAd({
  pathname,
  className,
}: {
  pathname: string
  className?: string
}) {
  return (
    <CarbonAdSlot
      pathname={pathname}
      template="sidebar"
      className={className}
    />
  )
}
