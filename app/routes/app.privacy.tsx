import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export default function PrivacyPolicy() {
  return (
    <s-page heading="Privacy Policy">
      <s-section heading="Appify Bundle Privacy Policy">
        <s-paragraph>Last updated: July 7, 2026</s-paragraph>
      </s-section>

      <s-section heading="Information we collect">
        <s-unordered-list>
          <s-list-item>
            Store information provided through Shopify OAuth (shop domain, access
            tokens).
          </s-list-item>
          <s-list-item>
            Bundle configuration data you create within the app.
          </s-list-item>
          <s-list-item>
            Order volume metrics for billing tier calculation (order IDs and
            counts only).
          </s-list-item>
          <s-list-item>
            App subscription and payment status for billing management.
          </s-list-item>
          <s-list-item>
            Anonymous storefront analytics (widget views, add-to-cart events,
            bundle purchase attribution by order ID).
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Customer data">
        <s-paragraph>
          We receive order webhooks from Shopify to count orders for billing and
          attribute bundle purchases. We only store order IDs, order totals,
          currency, and bundle-related line item data. We do not store customer
          names, email addresses, phone numbers, shipping addresses, or payment
          card details.
        </s-paragraph>
      </s-section>

      <s-section heading="How we use data">
        <s-unordered-list>
          <s-list-item>
            To provide bundle and discount functionality on your storefront.
          </s-list-item>
          <s-list-item>
            To calculate billing based on your monthly order volume and manage
            subscription plans.
          </s-list-item>
          <s-list-item>
            To enforce plan limits (pausing bundles when order limits are
            reached without an upgrade).
          </s-list-item>
          <s-list-item>
            To display analytics dashboards within the app admin.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Data storage & security">
        <s-paragraph>
          Data is stored in encrypted PostgreSQL databases (Supabase). All data
          in transit is protected with HTTPS/TLS. Access tokens are stored
          securely in our database. We do not sell merchant or customer data to
          third parties.
        </s-paragraph>
      </s-section>

      <s-section heading="Data retention">
        <s-unordered-list>
          <s-list-item>
            When you uninstall the app, sessions are deleted and billing is
            cancelled via the app/uninstalled webhook.
          </s-list-item>
          <s-list-item>
            48 hours after uninstall, Shopify sends shop/redact and we delete
            remaining store data (bundles, analytics, billing history, and
            profile).
          </s-list-item>
          <s-list-item>
            customers/redact removes order IDs we stored for that customer.
            customers/data_request is acknowledged; we do not store customer
            names, emails, phones, or addresses.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Contact">
        <s-paragraph>
          For privacy inquiries, contact your Appify Bundle support channel or
          the email listed on your Shopify App Store listing.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
