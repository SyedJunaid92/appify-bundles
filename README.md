# Appify Bundle

Production-ready Shopify embedded app for product bundles, volume discounts,
mix-and-match offers, and Buy X Get Y promotions.

## Features

- **Bundle Builder** — Six bundle types with visual editor and live preview
- **Theme App Extension** — Storefront widget embedded on product pages
- **Cart Transform Function** — Automatic bundle pricing at checkout
- **Order-Volume Billing** — Tiered pricing synced with Shopify Billing API
- **Analytics Dashboard** — Bundle performance overview
- **Multi-Store** — Isolated data per Shopify shop
- **Webhooks** — Order tracking, uninstall cleanup, scope updates

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, React Router 7, Polaris Web Components, App Bridge |
| Backend | React Router SSR (loaders/actions) |
| Database | PostgreSQL + Prisma ORM |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Vercel + Neon/Supabase |

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for full architecture details.

## Quick Start

### Prerequisites

- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started)
- Node.js 20+
- PostgreSQL database (Neon or Supabase recommended)

### Setup

```shell
cd appify-bundles
cp .env.example .env
# Fill in SHOPIFY_API_KEY, SHOPIFY_API_SECRET, DATABASE_URL, DIRECT_URL

npm install
npx prisma migrate deploy
shopify app dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Shopify CLI dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run deploy` | Deploy app + extensions to Shopify |

## Billing Tiers

| Monthly Orders | Price |
|----------------|-------|
| 0–1,000 | $40/mo |
| 1,001–2,000 | $75/mo |
| 2,001–4,000 | $100/mo |
| 4,001+ | $130/mo + $0.02/order over 4,000 |
| **Maximum** | **$799.99/mo** |

## Deployment (Vercel)

1. Connect the repo to Vercel
2. Set environment variables from `.env.example`
3. Vercel runs `vercel-build` (Prisma migrate + React Router build)
4. Run `shopify app deploy` to sync extensions and webhook URLs

## Project Structure

```
app/
├── components/     # UI components
├── constants/      # Billing tiers, bundle types
├── models/         # Database access (Prisma)
├── routes/         # Pages and API endpoints
├── schemas/        # Zod validation
├── services/       # Business logic
└── types/          # TypeScript types
extensions/
├── bundle-widget/          # Theme app extension
└── bundle-cart-transform/  # Shopify Function
```

## License

Private — commercial SaaS product.
