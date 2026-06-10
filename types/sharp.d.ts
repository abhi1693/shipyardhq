declare module "sharp" {
  type SharpOptions = {
    animated?: boolean
    limitInputPixels?: number | boolean
  }

  type ResizeOptions = {
    fit?: "inside" | "outside" | "cover" | "contain" | "fill"
    height?: number
    width?: number
    withoutEnlargement?: boolean
  }

  type WebpOptions = {
    effort?: number
    lossless?: boolean
    quality?: number
    smartSubsample?: boolean
  }

  type AvifOptions = {
    effort?: number
    quality?: number
  }

  type SharpInstance = {
    avif(options?: AvifOptions): SharpInstance
    resize(options?: ResizeOptions): SharpInstance
    rotate(): SharpInstance
    toBuffer(): Promise<Buffer>
    webp(options?: WebpOptions): SharpInstance
  }

  type SharpFactory = (
    input?: Buffer | Uint8Array | ArrayBuffer,
    options?: SharpOptions,
  ) => SharpInstance

  const sharp: SharpFactory
  export default sharp
}
