import { useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getShopWidgetSettings } from "../models/bundle.server";
import { BundleTypeCard } from "../components/BundleTypeCard";
import {
  BUNDLE_TYPES,
  BUNDLE_TYPE_GROUPS,
  COLOR_THEMES,
  type BundleTypeGroup,
} from "../constants/bundle-types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const widget = await getShopWidgetSettings(session.shop);
  return { widget };
};

function TypeGrid({
  group,
  theme,
}: {
  group: BundleTypeGroup;
  theme: { primary: string; badge: string };
}) {
  const types = BUNDLE_TYPES.filter((t) => t.group === group);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
      }}
    >
      {types.map((type) => (
        <BundleTypeCard key={type.id} type={type} theme={theme} />
      ))}
    </div>
  );
}

export default function ChooseBundleType() {
  const { widget } = useLoaderData<typeof loader>();
  const [selectedThemeId, setSelectedThemeId] = useState("black");

  const themeFromSettings = COLOR_THEMES.find(
    (t) => t.primary.toLowerCase() === String(widget.primaryColor || "").toLowerCase(),
  );
  const activeTheme =
    COLOR_THEMES.find((t) => t.id === selectedThemeId) ??
    themeFromSettings ??
    COLOR_THEMES[0];

  return (
    <s-page heading="Choose a discount type">
      <s-link slot="breadcrumb-actions" href="/app/bundles">
        Bundles
      </s-link>

      <s-section>
        <s-stack direction="block" gap="large">
          <s-stack direction="inline" gap="base">
            <s-paragraph tone="neutral">
              {BUNDLE_TYPE_GROUPS.volume.description}
            </s-paragraph>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <s-text tone="neutral">Color theme</s-text>
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedThemeId(theme.id)}
                  title={theme.id}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: theme.primary,
                    border:
                      activeTheme.id === theme.id
                        ? "2px solid #1a1a1a"
                        : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </s-stack>

          <TypeGrid group="volume" theme={activeTheme} />
        </s-stack>
      </s-section>

      <s-section heading={BUNDLE_TYPE_GROUPS.advanced.heading}>
        <s-paragraph tone="neutral">
          {BUNDLE_TYPE_GROUPS.advanced.description}
        </s-paragraph>
        <div style={{ marginTop: 16 }}>
          <TypeGrid group="advanced" theme={activeTheme} />
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
