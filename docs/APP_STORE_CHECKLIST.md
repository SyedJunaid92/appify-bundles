# App Store Pre-Submission Checklist

Use this checklist before submitting Appify Bundle to the Shopify App Store.

## Required Configuration

- [x] Embedded app with App Bridge (`embedded = true` in `shopify.app.toml`)
- [x] OAuth via Shopify (no custom login)
- [x] Billing via Shopify Billing API (no external payment)
- [x] App uninstall webhook configured
- [x] Scopes declared in `shopify.app.toml` match app functionality
- [x] Privacy policy page at `/app/privacy`
- [ ] App listing copy, screenshots, and demo store URL prepared in Partner Dashboard
- [ ] Support email configured in Partner Dashboard

## Technical Requirements

- [x] HTTPS production URL (Vercel)
- [x] PostgreSQL session storage (Prisma)
- [x] GDPR: session cleanup on `app/uninstalled`
- [x] HMAC-validated webhooks
- [x] No hardcoded API secrets in client bundle
- [x] Error boundaries on app routes
- [ ] Set `SHOPIFY_BILLING_TEST=false` for production billing before launch

## App Functionality

- [x] Bundle builder with 6 bundle types
- [x] Theme app extension (storefront widget)
- [x] Cart transform function for pricing
- [x] Order-volume billing tiers with monthly cap
- [x] Analytics dashboard
- [x] Merchant settings (widget customization)
- [x] Setup guide for theme embed activation

## Before Submitting

1. **Request Protected Customer Data access** in Partner Dashboard for `orders/create` webhook (required for billing order tracking). After approval, uncomment the webhook in `shopify.app.toml` and redeploy.
2. Run `shopify app deploy --allow-updates` to sync extensions and webhooks
2. Run `npx prisma migrate deploy` on production database
3. Test install flow on a development store
4. Test billing plan selection and approval flow
5. Verify bundle widget renders on product pages
6. Verify add-to-cart and order attribution work
7. Set production environment variables on Vercel:
   - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`
   - `SHOPIFY_APP_URL`, `DATABASE_URL`, `DIRECT_URL`
   - `CRON_SECRET` (for billing sync cron)
   - `SHOPIFY_BILLING_TEST=false` (when ready for live billing)

## Known Limitations

- Subscription bundles require Shopify Subscriptions on the merchant store
- Usage billing sync runs via Vercel cron (`/api/cron/billing-sync`)
- Enterprise overage charges require active TIER_ENTERPRISE subscription

## Deployment Commands

```bash
# Database migrations
npx prisma migrate deploy

# Vercel production deploy
vercel deploy --prod

# Shopify app + extensions deploy
shopify app deploy
```
