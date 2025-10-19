import { warmServer } from "@/lib/server/warmup"

export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  await warmServer()
}
