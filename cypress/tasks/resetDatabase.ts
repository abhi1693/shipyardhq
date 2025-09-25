/// <reference types="node" />

import { spawn } from "node:child_process"

const workspaceRoot = process.cwd()

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    })

    child.on("error", (error) => {
      reject(error)
    })

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      if (signal) {
        reject(new Error(`Command '${command}' terminated by signal ${signal}`))
        return
      }

      reject(new Error(`Command '${command}' exited with code ${code}`))
    })
  })
}

function ensureDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    console.warn("Database command skipped: DATABASE_URL not configured")
    return false
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to mutate the database in production environment")
  }

  return true
}

export async function resetDatabaseSchema() {
  if (!ensureDatabaseConfigured()) {
    return
  }

  await runCommand("npx", [
    "prisma",
    "migrate",
    "reset",
    "--force",
    "--skip-seed",
    "--skip-generate",
  ])
}

export async function seedDatabase() {
  if (!ensureDatabaseConfigured()) {
    return
  }

  await runCommand("npm", ["run", "prisma:seed", "--silent"])
}

export async function resetAndSeedDatabase() {
  await resetDatabaseSchema()
  await seedDatabase()
}
