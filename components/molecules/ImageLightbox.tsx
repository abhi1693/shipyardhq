"use client"

import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/atoms/dialog"

type Props = {
  src: string
  alt: string
  children: React.ReactNode
}

export default function ImageLightbox({ src, alt, children }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="p-0 border-0 bg-transparent shadow-none max-w-none w-auto"
        showCloseButton={false}
      >
        <div className="grid place-items-center max-h-[90vh] max-w-[95vw]">
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={900}
            className="h-auto w-auto max-h-[85vh] max-w-[90vw] object-contain rounded-md border bg-background"
            sizes="(max-width: 1024px) 90vw, 80vw"
            quality={95}
            priority={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
