import { access, cp, mkdir, rm } from "node:fs/promises"
import path from "node:path"

const projectDir = process.cwd()
const standaloneDir = path.join(projectDir, ".next", "standalone")
const assetDirs = ["public", ".next/static"]

// Next traces server dependencies but leaves static assets outside standalone.
// Run after Faro source maps are removed from the public static directory.
await access(path.join(standaloneDir, "server.js"))
for (const assetDir of assetDirs) {
  await access(path.join(projectDir, assetDir))
}

for (const assetDir of assetDirs) {
  const destination = path.join(standaloneDir, assetDir)
  await rm(destination, { recursive: true, force: true })
  await mkdir(path.dirname(destination), { recursive: true })
  await cp(path.join(projectDir, assetDir), destination, { recursive: true })
}

console.log("Prepared standalone public and static assets.")
