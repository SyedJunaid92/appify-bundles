import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import appStyles from "./styles/app.css?url";

export const links = () => [{ rel: "stylesheet", href: appStyles }];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body className="bg-neutral-50 dark:bg-neutral-950">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
