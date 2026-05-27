from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from catalog.models import (
    Category,
    Platform,
    PricingModel,
    Product,
    ProductCategoryAssignment,
    ProductPlatformAssignment,
    ProductType,
    UseCase,
)

PRODUCT_TYPES = (
    {
        "name": "SaaS",
        "slug": "saas",
        "description": "Cloud software delivered in the browser with hosted accounts and recurring access.",
    },
    {
        "name": "Browser extension",
        "slug": "browser-extension",
        "description": "Add-ons that live inside the browser to extend workflows or add context.",
    },
    {
        "name": "Mobile app",
        "slug": "mobile-app",
        "description": "Products built for iOS or Android as the primary surface.",
    },
    {
        "name": "Desktop app",
        "slug": "desktop-app",
        "description": "Native software for macOS, Windows, or Linux.",
    },
    {
        "name": "API",
        "slug": "api",
        "description": "APIs, SDKs, or developer platforms that power other products.",
    },
    {
        "name": "Open source",
        "slug": "open-source",
        "description": "Community-driven projects with source available for self-hosting or contribution.",
    },
    {
        "name": "Other",
        "slug": "other",
        "description": "Products that do not fit the usual buckets but still ship value.",
    },
)

PRICING_MODELS = (
    {
        "name": "Free",
        "slug": "free",
        "description": "Free tools without paid plans or upgrades required.",
    },
    {
        "name": "Freemium",
        "slug": "freemium",
        "description": "Products with a free tier plus optional paid upgrades.",
    },
    {
        "name": "Subscription",
        "slug": "subscription",
        "description": "Recurring subscriptions with monthly or annual billing.",
    },
    {
        "name": "One-time",
        "slug": "one-time",
        "description": "Single-purchase or lifetime access pricing without renewals.",
    },
    {
        "name": "Custom",
        "slug": "custom",
        "description": "Priced through sales or tailored commercial terms.",
    },
)

PLATFORMS = (
    {
        "name": "Web",
        "slug": "web",
        "description": "Browser-based SaaS and web apps built to run on any device.",
    },
    {
        "name": "iOS",
        "slug": "ios",
        "description": "Native iOS apps for iPhone and iPad.",
    },
    {
        "name": "Android",
        "slug": "android",
        "description": "Android apps designed for phones and tablets.",
    },
    {
        "name": "Mac",
        "slug": "mac",
        "description": "Native macOS desktop apps.",
    },
    {
        "name": "Windows",
        "slug": "windows",
        "description": "Windows desktop software built for PC users and teams.",
    },
    {
        "name": "Linux",
        "slug": "linux",
        "description": "Linux-ready tools and open-source software for popular distributions.",
    },
    {
        "name": "Chrome extension",
        "slug": "chrome-extension",
        "description": "Chrome extensions and browser add-ons for the Chrome Web Store.",
    },
    {
        "name": "Firefox extension",
        "slug": "firefox-extension",
        "description": "Firefox extensions and browser add-ons.",
    },
)

CATEGORIES = (
    {
        "name": "AI & Machine Learning",
        "slug": "ai-machine-learning",
        "icon": "brain",
        "description": "AI assistants, LLM apps, model tooling, and automation.",
    },
    {
        "name": "Developer Tools",
        "slug": "developer-tools",
        "icon": "code",
        "description": "SDKs, CLIs, frameworks, and tools for developers.",
    },
    {
        "name": "Productivity",
        "slug": "productivity",
        "icon": "checklist",
        "description": "Tasking, notes, calendars, and workflow acceleration.",
    },
    {
        "name": "Marketing",
        "slug": "marketing",
        "icon": "megaphone",
        "description": "SEO, content, ads, funnels, and landing page tools.",
    },
    {
        "name": "Sales",
        "slug": "sales",
        "icon": "target",
        "description": "CRM, outreach, proposals, and pipeline automation.",
    },
    {
        "name": "Analytics",
        "slug": "analytics",
        "icon": "chart",
        "description": "Product, web, and revenue analytics for growth.",
    },
    {
        "name": "Customer Support",
        "slug": "customer-support",
        "icon": "message",
        "description": "Help desks, chat, knowledge bases, and feedback.",
    },
    {
        "name": "Design & UI",
        "slug": "design-ui",
        "icon": "palette",
        "description": "Design systems, UI kits, and visual asset tooling.",
    },
    {
        "name": "No-Code & Low-Code",
        "slug": "no-code-low-code",
        "icon": "wrench",
        "description": "Build without code: automations, databases, and apps.",
    },
    {
        "name": "Automation & Workflow",
        "slug": "automation-workflow",
        "icon": "bolt",
        "description": "Connect apps and automate repeatable tasks.",
    },
    {
        "name": "Collaboration & Community",
        "slug": "collaboration-community",
        "icon": "users",
        "description": "Team communication, communities, and knowledge sharing.",
    },
    {
        "name": "Hosting & Cloud",
        "slug": "hosting-cloud",
        "icon": "cloud",
        "description": "Deploy, host, and scale apps and services.",
    },
    {
        "name": "Databases & Data",
        "slug": "databases-data",
        "icon": "database",
        "description": "SQL, NoSQL, data pipelines, ETL, and warehousing.",
    },
    {
        "name": "Security & Privacy",
        "slug": "security-privacy",
        "icon": "shield",
        "description": "App security, auth, compliance, and privacy tools.",
    },
    {
        "name": "APIs & Integrations",
        "slug": "apis-integrations",
        "icon": "tool",
        "description": "API platforms, connectors, and integration tooling.",
    },
    {
        "name": "Testing & QA",
        "slug": "testing-qa",
        "icon": "flask",
        "description": "Unit, end-to-end, performance testing, and QA automation.",
    },
    {
        "name": "Monitoring & Observability",
        "slug": "monitoring-observability",
        "icon": "chart",
        "description": "Logs, traces, uptime, and incident management.",
    },
    {
        "name": "DevOps & CI/CD",
        "slug": "devops-ci-cd",
        "icon": "rocket",
        "description": "Build, release, infrastructure, and developer platforms.",
    },
    {
        "name": "E-commerce",
        "slug": "e-commerce",
        "icon": "coins",
        "description": "Storefronts, payments, subscriptions, and checkout.",
    },
    {
        "name": "Finance & Accounting",
        "slug": "finance-accounting",
        "icon": "coins",
        "description": "Billing, invoices, bookkeeping, and forecasting.",
    },
    {
        "name": "Legal & Compliance",
        "slug": "legal-compliance",
        "icon": "scale",
        "description": "Policies, contracts, governance, and audits.",
    },
    {
        "name": "HR & Hiring",
        "slug": "hr-hiring",
        "icon": "briefcase",
        "description": "Recruiting, onboarding, payroll, and people operations.",
    },
    {
        "name": "Learning & Education",
        "slug": "learning-education",
        "icon": "school",
        "description": "Courses, tutoring, LMS, and knowledge platforms.",
    },
    {
        "name": "Content & Writing",
        "slug": "content-writing",
        "icon": "message",
        "description": "Copy, blogs, docs, and content automation.",
    },
    {
        "name": "SEO & Growth",
        "slug": "seo-growth",
        "icon": "target",
        "description": "Search optimization, keywording, and growth tools.",
    },
    {
        "name": "Social Media Tools",
        "slug": "social-media-tools",
        "icon": "share",
        "description": "Scheduling, analytics, and multi-platform publishing.",
    },
    {
        "name": "Video & Audio",
        "slug": "video-audio",
        "icon": "video",
        "description": "Creation, editing, hosting, and transcription.",
    },
    {
        "name": "Gaming & Entertainment",
        "slug": "gaming-entertainment",
        "icon": "gamepad",
        "description": "Game tools, communities, and creator utilities.",
    },
    {
        "name": "Health & Wellness",
        "slug": "health-wellness",
        "icon": "heartbeat",
        "description": "Fitness, care, mental health, and wellbeing.",
    },
    {
        "name": "Green & Sustainability",
        "slug": "green-sustainability",
        "icon": "leaf",
        "description": "Climate, energy, and sustainability tooling.",
    },
    {
        "name": "Real Estate",
        "slug": "real-estate",
        "icon": "building",
        "description": "Property tech, listings, and real-estate operations.",
    },
    {
        "name": "Travel & Tourism",
        "slug": "travel-tourism",
        "icon": "plane",
        "description": "Trip planning, booking, and travel management.",
    },
    {
        "name": "Food & Beverage",
        "slug": "food-beverage",
        "icon": "chefhat",
        "description": "Restaurants, delivery, kitchen operations, and hospitality tech.",
    },
    {
        "name": "Web3 & Crypto",
        "slug": "web3-crypto",
        "icon": "hexagon",
        "description": "Crypto, wallets, on-chain data, and apps.",
    },
    {
        "name": "Crypto Infrastructure",
        "slug": "crypto-infrastructure",
        "icon": "hexagon",
        "description": "Nodes, staking, custody, and blockchain infrastructure.",
    },
    {
        "name": "Crypto Payments",
        "slug": "crypto-payments",
        "icon": "coins",
        "description": "On-chain payments, merchant tooling, and stablecoin rails.",
    },
    {
        "name": "Crypto Analytics",
        "slug": "crypto-analytics",
        "icon": "chart",
        "description": "On-chain analytics, portfolio tracking, and market data.",
    },
    {
        "name": "IoT & Hardware",
        "slug": "iot-hardware",
        "icon": "wifi",
        "description": "Connected devices, hardware kits, and telemetry.",
    },
    {
        "name": "Customer Success",
        "slug": "customer-success",
        "icon": "handheart",
        "description": "Lifecycle health, playbooks, renewals, and expansion.",
    },
    {
        "name": "Product Management",
        "slug": "product-management",
        "icon": "checklist",
        "description": "Roadmaps, prioritization, discovery, and insights.",
    },
    {
        "name": "Internal Tools",
        "slug": "internal-tools",
        "icon": "tool",
        "description": "Back-office dashboards, admin panels, and operations tooling.",
    },
    {
        "name": "Marketplace Platforms",
        "slug": "marketplace-platforms",
        "icon": "share",
        "description": "Two-sided marketplaces and platform orchestration.",
    },
    {
        "name": "Field Operations & Logistics",
        "slug": "field-operations-logistics",
        "icon": "map",
        "description": "Routing, dispatch, fleet management, and on-site operations.",
    },
    {
        "name": "Creator Economy",
        "slug": "creator-economy",
        "icon": "video",
        "description": "Tools for content entrepreneurs, memberships, and monetization.",
    },
)

USE_CASES = (
    {
        "name": "Launch a SaaS",
        "slug": "launch-saas",
        "description": "Find products and workflows for launching a hosted software business.",
        "categories": ("developer-tools", "productivity"),
    },
    {
        "name": "Automate Workflows",
        "slug": "automate-workflows",
        "description": "Connect tools, reduce repeated work, and move routine operations faster.",
        "categories": ("automation-workflow", "no-code-low-code"),
    },
    {
        "name": "Grow Your Audience",
        "slug": "grow-your-audience",
        "description": "Improve reach across content, search, social, and owned channels.",
        "categories": ("marketing", "seo-growth", "social-media-tools"),
    },
    {
        "name": "Build Community",
        "slug": "build-community",
        "description": "Create stronger communication loops with customers, members, and teams.",
        "categories": ("collaboration-community",),
    },
    {
        "name": "Ship Faster",
        "slug": "ship-faster",
        "description": "Improve build, release, testing, and monitoring workflows.",
        "categories": ("devops-ci-cd", "testing-qa", "monitoring-observability"),
    },
    {
        "name": "Automate Support",
        "slug": "automate-support",
        "description": "Handle support volume with better routing, answers, and assistance.",
        "categories": ("customer-support", "ai-machine-learning"),
    },
    {
        "name": "Scale Customer Success",
        "slug": "scale-customer-success",
        "description": "Improve lifecycle health, renewals, expansion, and customer outcomes.",
        "categories": ("customer-success", "product-management"),
    },
    {
        "name": "Build Internal Tools",
        "slug": "build-internal-tools",
        "description": "Create dashboards, workflows, and operational software for internal teams.",
        "categories": ("internal-tools", "developer-tools"),
    },
    {
        "name": "Launch a Marketplace",
        "slug": "launch-marketplace",
        "description": "Build, operate, and grow marketplace-style products.",
        "categories": ("marketplace-platforms", "e-commerce", "creator-economy"),
    },
    {
        "name": "Optimize Field Operations",
        "slug": "optimize-field-operations",
        "description": "Coordinate dispatch, route planning, hardware, and field teams.",
        "categories": ("field-operations-logistics", "iot-hardware"),
    },
    {
        "name": "Monetize Content",
        "slug": "monetize-content",
        "description": "Turn content, media, and audience work into durable revenue.",
        "categories": ("creator-economy", "content-writing", "video-audio"),
    },
    {
        "name": "Deliver Analytics",
        "slug": "deliver-analytics",
        "description": "Build visibility into product, traffic, usage, and operational trends.",
        "categories": ("analytics", "monitoring-observability", "ai-machine-learning"),
    },
    {
        "name": "Launch a Crypto App",
        "slug": "launch-crypto-app",
        "description": "Build wallet, data, payments, and infrastructure-backed crypto products.",
        "categories": ("web3-crypto", "crypto-infrastructure", "developer-tools"),
    },
    {
        "name": "Accept Crypto Payments",
        "slug": "accept-crypto-payments",
        "description": "Add on-chain payments and stablecoin rails to commercial workflows.",
        "categories": ("crypto-payments", "e-commerce", "finance-accounting"),
    },
    {
        "name": "Monitor On-Chain Activity",
        "slug": "monitor-on-chain-activity",
        "description": "Track blockchain activity, risk, portfolios, and market signals.",
        "categories": ("crypto-analytics", "analytics", "security-privacy"),
    },
    {
        "name": "Secure Your Stack",
        "slug": "secure-your-stack",
        "description": "Protect apps and infrastructure with security, privacy, and observability tools.",
        "categories": ("security-privacy", "devops-ci-cd", "monitoring-observability"),
    },
    {
        "name": "Automate Finance Ops",
        "slug": "automate-finance-ops",
        "description": "Streamline billing, invoicing, reporting, and back-office financial work.",
        "categories": ("finance-accounting", "automation-workflow", "internal-tools"),
    },
    {
        "name": "Empower Remote Teams",
        "slug": "empower-remote-teams",
        "description": "Support async collaboration, productivity, hiring, and distributed teams.",
        "categories": ("collaboration-community", "productivity", "hr-hiring"),
    },
)

SAMPLE_PRODUCTS = (
    {
        "name": "Lumina AI",
        "slug": "lumina-ai",
        "tagline": "A collaborative AI workspace for small teams.",
        "summary": "Plan, write, and organize team knowledge with practical AI workflows.",
        "description": (
            "Lumina AI helps founders turn notes, documents, and customer context into usable team workspaces."
        ),
        "website_url": "https://lumina.example.com",
        "categories": ("ai-machine-learning", "productivity"),
        "product_type": "saas",
        "pricing_model": "freemium",
        "platforms": ("web", "mac"),
    },
    {
        "name": "ClipForge",
        "slug": "clipforge",
        "tagline": "Fast video editing for indie creators.",
        "summary": "Create launch clips, social cutdowns, and product demos without a heavy editing stack.",
        "description": (
            "ClipForge gives creators a focused editor for launch videos, tutorials, and short-form product content."
        ),
        "website_url": "https://clipforge.example.com",
        "categories": ("video-audio", "creator-economy"),
        "product_type": "saas",
        "pricing_model": "subscription",
        "platforms": ("web",),
    },
    {
        "name": "InvoiceFlow",
        "slug": "invoiceflow",
        "tagline": "Simple invoicing for solo founders.",
        "summary": "Send invoices, track payments, and keep revenue admin under control.",
        "description": (
            "InvoiceFlow helps small businesses manage invoices and payment status "
            "without building a finance department."
        ),
        "website_url": "https://invoiceflow.example.com",
        "categories": ("finance-accounting", "automation-workflow"),
        "product_type": "saas",
        "pricing_model": "subscription",
        "platforms": ("web",),
    },
    {
        "name": "Taskora",
        "slug": "taskora",
        "tagline": "A sharper task manager for product teams.",
        "summary": "Turn customer signals and product ideas into focused execution lists.",
        "description": "Taskora keeps planning lightweight while giving teams enough structure to ship reliably.",
        "website_url": "https://taskora.example.com",
        "categories": ("productivity", "product-management"),
        "product_type": "mobile-app",
        "pricing_model": "freemium",
        "platforms": ("web", "ios", "android"),
    },
    {
        "name": "BrandGuard",
        "slug": "brandguard",
        "tagline": "Monitor brand risk before it grows.",
        "summary": "Track mentions, lookalikes, and trust signals across public channels.",
        "description": (
            "BrandGuard gives operators a clean view of brand exposure, impersonation risk, and customer-facing issues."
        ),
        "website_url": "https://brandguard.example.com",
        "categories": ("security-privacy", "monitoring-observability"),
        "product_type": "saas",
        "pricing_model": "custom",
        "platforms": ("web",),
    },
    {
        "name": "EchoNotes",
        "slug": "echonotes",
        "tagline": "Voice notes that turn into useful writing.",
        "summary": "Capture thoughts, clean them up, and publish them into docs or tasks.",
        "description": "EchoNotes turns spoken notes into structured drafts, follow-ups, and searchable knowledge.",
        "website_url": "https://echonotes.example.com",
        "categories": ("content-writing", "video-audio"),
        "product_type": "mobile-app",
        "pricing_model": "free",
        "platforms": ("ios", "android"),
    },
)


class Command(BaseCommand):
    help = "Seed reusable development data for local testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-email",
            help=(
                "Attach sample products to this existing user. "
                "Defaults to the first active superuser, then active user."
            ),
        )
        parser.add_argument(
            "--with-products",
            action="store_true",
            help="Also seed sample products.",
        )
        parser.add_argument(
            "--skip-products",
            action="store_true",
            help="Seed taxonomy data only. Kept for compatibility; this is now the default.",
        )
        parser.add_argument(
            "--purge-products",
            action="store_true",
            help="Delete sample products managed by this seed command.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        product_types = self._seed_lookup(ProductType, PRODUCT_TYPES)
        pricing_models = self._seed_lookup(PricingModel, PRICING_MODELS)
        platforms = self._seed_lookup(Platform, PLATFORMS)
        categories = self._seed_categories()
        use_cases = self._seed_use_cases(categories)

        purged_product_count = 0
        if options["purge_products"]:
            purged_product_count = self._purge_sample_products()

        product_count = 0
        if options["with_products"] and not options["skip_products"]:
            owner = self._get_product_owner(options.get("user_email"))
            if owner is None:
                self.stdout.write(self.style.WARNING("No active user found. Product examples were skipped."))
            else:
                product_count = self._seed_products(
                    owner,
                    categories,
                    product_types,
                    pricing_models,
                    platforms,
                )
        elif options.get("user_email"):
            self.stdout.write(self.style.WARNING("--user-email was ignored because --with-products was not set."))

        purge_summary = f", removed {purged_product_count} sample products" if purged_product_count else ""
        self.stdout.write(
            self.style.SUCCESS(
                "Seeded "
                f"{len(product_types)} product types, "
                f"{len(pricing_models)} pricing models, "
                f"{len(platforms)} platforms, "
                f"{len(categories)} categories, "
                f"{len(use_cases)} use cases, "
                f"{product_count} products"
                f"{purge_summary}."
            )
        )

    def _seed_lookup(self, model, rows):
        objects_by_slug = {}
        for row in rows:
            obj, _ = model.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "description": row["description"],
                    "is_active": True,
                },
            )
            objects_by_slug[row["slug"]] = obj
        return objects_by_slug

    def _seed_categories(self):
        categories = {}
        for row in CATEGORIES:
            category, _ = Category.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "icon": row["icon"],
                    "description": row["description"],
                    "is_active": True,
                },
            )
            categories[row["slug"]] = category
        return categories

    def _seed_use_cases(self, categories):
        use_cases = {}
        for row in USE_CASES:
            use_case, _ = UseCase.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "description": row["description"],
                    "is_active": True,
                },
            )
            use_case.categories.set(categories[slug] for slug in row["categories"])
            use_cases[row["slug"]] = use_case
        return use_cases

    def _get_product_owner(self, email):
        User = get_user_model()
        queryset = User.objects.filter(is_active=True)
        if email:
            return queryset.filter(email__iexact=email).first()
        return queryset.order_by("-is_superuser", "date_joined", "pk").first()

    def _seed_products(self, owner, categories, product_types, pricing_models, platforms):
        now = timezone.now()
        count = 0

        for index, row in enumerate(SAMPLE_PRODUCTS):
            product, _ = Product.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "owner": owner,
                    "name": row["name"],
                    "tagline": row["tagline"],
                    "summary": row["summary"],
                    "description": row["description"],
                    "website_url": row["website_url"],
                    "status": Product.Status.PUBLISHED,
                    "is_listed": True,
                    "submitted_at": now,
                    "published_at": now - timedelta(days=index),
                    "product_type": product_types[row["product_type"]],
                    "pricing_model": pricing_models[row["pricing_model"]],
                },
            )
            self._sync_product_categories(product, [categories[slug] for slug in row["categories"]])
            self._sync_product_platforms(product, [platforms[slug] for slug in row["platforms"]])
            count += 1

        return count

    def _purge_sample_products(self):
        sample_slugs = [row["slug"] for row in SAMPLE_PRODUCTS]
        queryset = Product.objects.filter(slug__in=sample_slugs)
        product_count = queryset.count()
        queryset.delete()
        return product_count

    def _sync_product_categories(self, product, categories):
        ProductCategoryAssignment.objects.filter(product=product).exclude(category__in=categories).delete()
        for category in categories:
            ProductCategoryAssignment.objects.get_or_create(product=product, category=category)

    def _sync_product_platforms(self, product, platforms):
        ProductPlatformAssignment.objects.filter(product=product).exclude(platform__in=platforms).delete()
        for platform in platforms:
            ProductPlatformAssignment.objects.get_or_create(product=product, platform=platform)
