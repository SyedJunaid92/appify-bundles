import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy | Appify Bundles" },
  {
    name: "description",
    content:
      "How Appify Bundles collects, uses, and deletes merchant and store data.",
  },
];

export default function PublicPrivacyPolicy() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium text-neutral-500">Appify Bundles</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          Last updated: September 6, 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-7 text-neutral-700">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Who we are</h2>
            <p className="mt-2">
              Appify Bundles is a Shopify app that helps merchants create
              product bundles, quantity breaks, and related storefront offers.
              This policy describes the data we process when you install or use
              the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">
              Information we collect
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Store information from Shopify OAuth, including the shop domain
                and access tokens needed to run the app.
              </li>
              <li>Bundle configuration data you create in the app.</li>
              <li>
                Order volume metrics used for billing. We store order IDs and
                counts, not customer profiles.
              </li>
              <li>App subscription and payment status for billing.</li>
              <li>
                Anonymous storefront analytics such as widget views, add-to-cart
                events, and bundle purchase attribution by order ID.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">
              Customer data
            </h2>
            <p className="mt-2">
              We may receive order webhooks from Shopify to count orders for
              billing and to attribute bundle purchases. We store order IDs,
              order totals, currency, and bundle-related line item data. We do
              not store customer names, email addresses, phone numbers, shipping
              addresses, or payment card details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">
              How we use data
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                To provide bundle and discount functionality on your storefront.
              </li>
              <li>
                To calculate billing from monthly order volume and to manage
                subscriptions.
              </li>
              <li>
                To enforce plan limits, including pausing bundles when a plan
                limit is reached.
              </li>
              <li>To show analytics inside the app admin.</li>
              <li>
                To assign A/B test variants on the storefront using a first-party
                cookie.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Cookies</h2>
            <p className="mt-2">
              If you run an A/B test, the storefront may set a first-party cookie
              named with an <code>appify_ab_</code> prefix. The cookie stores
              only the assigned variant (control or challenger) for up to 30
              days. It is not used for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">
              Data storage and security
            </h2>
            <p className="mt-2">
              Data is stored in encrypted PostgreSQL databases. Data in transit
              is protected with HTTPS/TLS. Access tokens are stored securely. We
              do not sell merchant or customer data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">
              Data retention and deletion
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                When you uninstall the app, sessions are deleted and billing is
                cancelled through the app/uninstalled webhook.
              </li>
              <li>
                After uninstall, Shopify sends shop/redact. We then delete
                remaining store data, including bundles, analytics, billing
                history, and shop profile.
              </li>
              <li>
                customers/redact removes order IDs we stored for that customer.
                customers/data_request is acknowledged. We do not store customer
                names, emails, phones, or addresses, so there is no additional
                personal data to return.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">
              Sharing of data
            </h2>
            <p className="mt-2">
              We share data with Shopify as required to operate billing,
              authentication, and storefront features. Hosting and database
              providers process data only to run the app. We do not sell data
              and we do not share it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">Contact</h2>
            <p className="mt-2">
              For privacy questions, use the developer contact on the Appify
              Bundles listing in the Shopify App Store, or contact the support
              email shown on that listing.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
