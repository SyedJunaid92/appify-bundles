# Appify Bundle — Architecture

## Overview

Appify Bundle is a production Shopify embedded SaaS for product bundles, volume discounts,
mix-and-match offers, and Buy X Get Y promotions. The app runs on Vercel with PostgreSQL
(Neon/Supabase) and follows Shopify's recommended React Router embedded app pattern.

## Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18+, React Router 7, Polaris Web Components | Embedded admin UI |
| Backend | React Router SSR loaders/actions | Replaces separate Express server |
| Database | PostgreSQL + Prisma ORM | Sessions, bundles, billing |
| Auth | Shopify OAuth + App Bridge | Multi-store via per-shop sessions |
| Extensions | Theme App Extension, Cart Transform Function | Storefront widget + cart pricing |
| Deployment | Vercel + `@vercel/react-router` | Zero-config serverless |
| Validation | Zod | API inputs, forms, webhooks |
| Testing | Vitest | Unit tests for business logic |

> **Why React Router SSR instead of Express + Vite SPA?**  
> Shopify's official embedded app template uses React Router with server-side loaders/actions.
> This integrates OAuth, webhooks, billing, and Vercel deployment without a separate API
> layer. Business logic lives in `app/services/` and `app/models/` — cleanly separated from UI.

## Directory Structure

```
appify-bundles/
├── app/
│   ├── components/       # React UI components
│   ├── constants/        # Static config (billing tiers, bundle types)
│   ├── models/           # Database access layer (Prisma queries)
│   ├── routes/           # React Router pages + API endpoints
│   ├── schemas/          # Zod validation schemas
│   ├── services/         # Business logic (billing, bundle save, Shopify sync)
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Pure helper functions
├── extensions/
│   ├── bundle-widget/    # Theme app extension (storefront widget)
│   └── bundle-cart-transform/  # Shopify Function (cart pricing)
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # SQL migrations
├── docs/                 # Architecture and guides
└── tests/                # Vitest unit tests
```

## Data Flow

```
Merchant Admin (Polaris UI)
        │
        ▼
React Router Loader/Action
        │
        ├──► Zod Schema Validation
        │
        ├──► Service Layer (business logic)
        │
        └──► Model Layer (Prisma)
                │
                ▼
            PostgreSQL
                │
                ▼
        Shopify Admin API / Billing API
                │
                ▼
        Storefront (Theme Extension + App Proxy)
```

## Core Features

### Bundle Builder
- Six bundle types: quantity breaks, BXGY, mix-and-match, complete bundle, subscription, progressive gifts
- Visual editor with live preview
- Syncs parent products and cart transform metafields to Shopify

### Billing (Order-Volume Tiers)
| Monthly Orders | Base Price | Overage |
|----------------|------------|---------|
| 0–1,000 | $40/mo | — |
| 1,001–2,000 | $75/mo | — |
| 2,001–4,000 | $100/mo | — |
| 4,001+ | $130/mo | $0.02 per order over 4,000 |
| **Cap** | **$799.99/mo max** | |

Order counts are tracked via `orders/create` webhooks. Usage charges are submitted through
Shopify Billing API. Billing history is persisted in PostgreSQL.

### Multi-Store Support
Each Shopify store gets an isolated `Session`, `ShopSettings`, and `ShopBilling` record.
Data is scoped by `shop` domain on every query.

### Webhooks
- `app/uninstalled` — cleanup sessions
- `app/scopes_update` — scope changes
- `orders/create` — increment monthly order count for billing

## Security

- HMAC-validated webhooks via `authenticate.webhook`
- Session tokens via Shopify OAuth (offline + online)
- All DB queries scoped by authenticated shop
- Zod validation on all user inputs
- No secrets in client bundle (`SHOPIFY_API_SECRET`, `DATABASE_URL` server-only)

## Deployment (Vercel)

1. Connect repo to Vercel
2. Set environment variables from `.env.example`
3. `vercel-build` runs `prisma migrate deploy` + `react-router build`
4. Deploy Shopify app extensions via `shopify app deploy`

## Milestones

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Foundation: billing tiers, Zod, tests, docs | Complete |
| M2 | Analytics dashboard, React Hook Form, TanStack Query | Complete |
| M3 | Dark mode, Tailwind, expanded test coverage | Complete |
| M4 | Advanced bundle types, billing sync, App Store prep | Complete |
