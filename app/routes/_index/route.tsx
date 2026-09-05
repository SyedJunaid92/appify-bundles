import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, redirect } from "react-router";

import styles from "./styles.module.css";

export const meta: MetaFunction = () => [
  { title: "Appify Bundles — Shopify product bundles and quantity breaks" },
  {
    name: "description",
    content:
      "Appify Bundles is a Shopify app for quantity breaks, BOGO offers, mix-and-match deals, product bundles, and optional free gifts.",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Appify Bundles</h1>
        <p className={styles.text}>
          A Shopify app that adds quantity breaks, BOGO offers, mix-and-match
          deals, product bundles, frequently bought together add-ons, and
          optional free gifts to your online store.
        </p>
        <p className={styles.install}>
          Install Appify Bundles from the Shopify App Store, then open it from
          your Shopify admin. This page does not ask for a shop domain.
        </p>
        <p>
          <a
            className={styles.button}
            href="https://apps.shopify.com/appify-bundles"
          >
            View on the Shopify App Store
          </a>
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Volume and bundle offers.</strong> Merchants configure
            quantity breaks, Buy X Get Y, mix-and-match, and fixed product
            bundles in the Shopify admin.
          </li>
          <li>
            <strong>Storefront widget.</strong> Offers render through a theme
            app embed. Buyers add items with Shopify cart and checkout — no
            offsite checkout.
          </li>
          <li>
            <strong>Shopify Billing.</strong> App charges use Shopify volume
            billing. Optional gifts are added only after the buyer taps Add
            free gift.
          </li>
        </ul>
        <p className={styles.footer}>
          <Link to="/privacy">Privacy policy</Link>
        </p>
      </div>
    </div>
  );
}
