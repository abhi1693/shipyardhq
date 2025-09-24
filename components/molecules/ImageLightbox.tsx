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
        className="p-0 border-0 bg-transparent shadow-none w-auto max-w-[95vw] sm:max-w-[85vw] max-h-[90vh] place-items-center"
        showCloseButton={false}
      >
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={900}
          className="h-auto w-auto max-h-[85vh] max-w-full object-contain rounded-md border bg-background"
          sizes="(max-width: 640px) 95vw, 85vw"
          quality={95}
          priority={false}
        />
      </DialogContent>
    </Dialog>
  )
}
