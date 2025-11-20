import path from "node:path"
import { pathToFileURL } from "node:url"

import { PrismaClient } from "@/lib/vendor/prisma/client"
import slugifyLib from "slugify"
import { createSeedPrismaClient } from "./seedClient"

// Use same slug rules as app utils
const slugify = (text: string) =>
  slugifyLib(text, { lower: true, strict: true })

export type SeedCategory = {
  name: string
  icon: string // must match CategoryIconKey from components/molecules/CategoryIcons.tsx
  description: string
  slug?: string
}

// Comprehensive, all‑rounder category set aligned to indie/micro‑SaaS
export const CATEGORIES: SeedCategory[] = [
  {
    name: "AI & Machine Learning",
    icon: "brain",
    description: "AI assistants, LLM apps, model tooling, and automation.",
  },
  {
    name: "Developer Tools",
    icon: "code",
    description: "SDKs, CLIs, frameworks, and tools for developers.",
  },
  {
    name: "Productivity",
    icon: "checklist",
    description: "Tasking, notes, calendars, and workflow acceleration.",
  },
  {
    name: "Marketing",
    icon: "megaphone",
    description: "SEO, content, ads, funnels, and landing page tools.",
  },
  {
    name: "Sales",
    icon: "target",
    description: "CRM, outreach, proposals, and pipeline automation.",
  },
  {
    name: "Analytics",
    icon: "chart",
    description: "Product, web, and revenue analytics for growth.",
  },
  {
    name: "Customer Support",
    icon: "message",
    description: "Help desks, chat, knowledge bases, and feedback.",
  },
  {
    name: "Design & UI",
    icon: "palette",
    description: "Design systems, UI kits, and visual asset tooling.",
  },
  {
    name: "No‑Code & Low‑Code",
    icon: "wrench",
    description: "Build without code: automations, databases, and apps.",
  },
  {
    name: "Automation & Workflow",
    icon: "bolt",
    description: "Connect apps and automate repeatable tasks.",
  },
  {
    name: "Collaboration & Community",
    icon: "users",
    description: "Team communication, communities, and knowledge sharing.",
  },
  {
    name: "Hosting & Cloud",
    icon: "cloud",
    description: "Deploy, host, and scale apps and services.",
  },
  {
    name: "Databases & Data",
    icon: "database",
    description: "SQL/NoSQL, data pipelines, ETL, and warehousing.",
  },
  {
    name: "Security & Privacy",
    icon: "shield",
    description: "App security, auth, compliance, and privacy tools.",
  },
  {
    name: "APIs & Integrations",
    icon: "tool",
    description: "API platforms, connectors, and integration tooling.",
  },
  {
    name: "Testing & QA",
    icon: "flask",
    description: "Unit, e2e, performance testing, and QA automation.",
  },
  {
    name: "Monitoring & Observability",
    icon: "chart",
    description: "Logs, traces, uptime, and incident management.",
  },
  {
    name: "DevOps & CI/CD",
    icon: "rocket",
    description: "Build, release, infrastructure, and developer platforms.",
  },
  {
    name: "E‑commerce",
    icon: "coins",
    description: "Storefronts, payments, subscriptions, and checkout.",
  },
  {
    name: "Finance & Accounting",
    icon: "coins",
    description: "Billing, invoices, bookkeeping, and forecasting.",
  },
  {
    name: "Legal & Compliance",
    icon: "scale",
    description: "Policies, contracts, governance, and audits.",
  },
  {
    name: "HR & Hiring",
    icon: "briefcase",
    description: "Recruiting, onboarding, payroll, and people ops.",
  },
  {
    name: "Learning & Education",
    icon: "school",
    description: "Courses, tutoring, LMS, and knowledge platforms.",
  },
  {
    name: "Content & Writing",
    icon: "message",
    description: "Copy, blogs, docs, and content automation.",
  },
  {
    name: "SEO & Growth",
    icon: "target",
    description: "Search optimization, keywording, and growth tools.",
  },
  {
    name: "Social Media Tools",
    icon: "share",
    description: "Scheduling, analytics, and multi‑platform publishing.",
  },
  {
    name: "Video & Audio",
    icon: "video",
    description: "Creation, editing, hosting, and transcription.",
  },
  {
    name: "Gaming & Entertainment",
    icon: "gamepad",
    description: "Game tools, communities, and creator utilities.",
  },
  {
    name: "Health & Wellness",
    icon: "heartbeat",
    description: "Fitness, care, mental health, and wellbeing.",
  },
  {
    name: "Green & Sustainability",
    icon: "leaf",
    description: "Climate, energy, and sustainability tooling.",
  },
  {
    name: "Real Estate",
    icon: "building",
    description: "Property tech, listings, and real‑estate operations.",
  },
  {
    name: "Travel & Tourism",
    icon: "plane",
    description: "Trip planning, booking, and travel management.",
  },
  {
    name: "Food & Beverage",
    icon: "chefhat",
    description: "Restaurants, delivery, kitchen ops, and hospitality tech.",
  },
  {
    name: "Web3 & Crypto",
    icon: "hexagon",
    description: "Crypto, wallets, on-chain data, and dApps.",
  },
  {
    name: "Crypto Infrastructure",
    icon: "hexagon",
    description: "Nodes, staking, custody, and blockchain infrastructure.",
  },
  {
    name: "Crypto Payments",
    icon: "coins",
    description: "On-chain payments, merchant tooling, and stablecoin rails.",
  },
  {
    name: "Crypto Analytics",
    icon: "chart",
    description: "On-chain analytics, portfolio tracking, and market data.",
  },
  {
    name: "IoT & Hardware",
    icon: "wifi",
    description: "Connected devices, hardware kits, and telemetry.",
  },
  {
    name: "Customer Success",
    icon: "handheart",
    description: "Lifecycle health, playbooks, renewals, and expansion.",
  },
  {
    name: "Product Management",
    icon: "checklist",
    description: "Roadmaps, prioritization, discovery, and insights.",
  },
  {
    name: "Internal Tools",
    icon: "tool",
    description: "Back-office dashboards, admin panels, and ops tooling.",
  },
  {
    name: "Marketplace Platforms",
    icon: "share",
    description: "Two-sided marketplaces and platform orchestration.",
  },
  {
    name: "Field Operations & Logistics",
    icon: "map",
    description: "Routing, dispatch, fleet management, and on-site ops.",
  },
  {
    name: "Creator Economy",
    icon: "video",
    description:
      "Tools for content entrepreneurs, memberships, and monetization.",
  },
]

export async function seedCategories(prisma: PrismaClient) {
  const results = [] as { name: string; slug: string; action: string }[]

  for (const item of CATEGORIES) {
    const slug = item.slug ?? slugify(item.name)
    const data = {
      name: item.name,
      slug,
      icon: item.icon,
      description: item.description,
    }

    const existing = await prisma.category.findUnique({ where: { slug } })
    const action = existing ? "update" : "create"

    await prisma.category.upsert({
      where: { slug },
      update: {
        name: data.name,
        icon: data.icon,
        description: data.description,
      },
      create: data,
    })
    results.push({ name: item.name, slug, action })
  }

  console.table(results)
  return results
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false
  const cliUrl = pathToFileURL(path.resolve(process.argv[1])).href
  return import.meta.url === cliUrl
})()

if (invokedDirectly) {
  const prisma = createSeedPrismaClient()
  seedCategories(prisma)
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
