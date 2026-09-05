import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  DEFAULT_WIDGET_COLORS,
} from "../constants/billing";
import {
  getShopWidgetSettings,
  updateShopWidgetSettings,
} from "../models/bundle.server";
import { widgetSettingsSchema } from "../schemas/bundle.schema";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const widget = await getShopWidgetSettings(session.shop);
  return { widget: { ...DEFAULT_WIDGET_COLORS, ...widget } };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const raw: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_WIDGET_COLORS)) {
    const value = form.get(key);
    if (value) raw[key] = String(value);
  }

  const parsed = widgetSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid widget settings.", issues: parsed.error.issues };
  }

  await updateShopWidgetSettings(session.shop, parsed.data);
  return { success: true, widget: parsed.data };
};

export default function WidgetSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const [colors, setColors] = useState<Record<string, string>>(
    widget as Record<string, string>,
  );

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Widget colors saved");
    }
  }, [actionData, shopify]);

  const colorFields: Array<{ key: string; label: string }> = [
    { key: "primaryColor", label: "Primary color" },
    { key: "secondaryColor", label: "Secondary color" },
    { key: "accentColor", label: "Accent color" },
    { key: "textColor", label: "Text color" },
    { key: "backgroundColor", label: "Background color" },
    { key: "borderColor", label: "Border color" },
    { key: "selectedBorderColor", label: "Selected border" },
    { key: "badgeColor", label: "Badge color" },
    { key: "badgeTextColor", label: "Badge text color" },
  ];

  return (
    <s-page heading="Widget customization">
      <Form method="post">
        <s-section heading="Colors">
          <s-stack direction="block" gap="base">
            {colorFields.map(({ key, label }) => (
              <s-stack key={key} direction="inline" gap="base">
                <label style={{ minWidth: 140 }}>{label}</label>
                <input
                  type="color"
                  name={key}
                  value={colors[key]}
                  onChange={(e) =>
                    setColors((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
                <span style={{ width: 90, fontFamily: "monospace" }}>
                  {colors[key]}
                </span>
              </s-stack>
            ))}

            <s-text-field
              label="Border radius (px)"
              name="borderRadius"
              value={colors.borderRadius}
              onInput={(e: Event) =>
                setColors((prev) => ({
                  ...prev,
                  borderRadius: (e.target as HTMLInputElement).value,
                }))
              }
            />
            <s-text-field
              label="Font size (px)"
              name="fontSize"
              value={colors.fontSize}
              onInput={(e: Event) =>
                setColors((prev) => ({
                  ...prev,
                  fontSize: (e.target as HTMLInputElement).value,
                }))
              }
            />
          </s-stack>
        </s-section>

        <s-section heading="Preview">
          <div
            style={{
              "--ab-primary": colors.primaryColor,
              "--ab-bg": colors.backgroundColor,
              "--ab-text": colors.textColor,
              "--ab-border": colors.borderColor,
              "--ab-selected": colors.selectedBorderColor,
              "--ab-badge": colors.badgeColor,
              "--ab-badge-text": colors.badgeTextColor,
              "--ab-radius": `${colors.borderRadius}px`,
              "--ab-font-size": `${colors.fontSize}px`,
              padding: "16px",
              background: colors.backgroundColor,
              borderRadius: `${colors.borderRadius}px`,
              border: `1px solid ${colors.borderColor}`,
              color: colors.textColor,
              fontSize: `${colors.fontSize}px`,
            } as React.CSSProperties}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Buy more, save more
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["1 item", "2 items", "3 items"].map((label, i) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    padding: "12px 8px",
                    border: `2px solid ${i === 1 ? colors.selectedBorderColor : colors.borderColor}`,
                    borderRadius: `${colors.borderRadius}px`,
                    textAlign: "center",
                    background: colors.secondaryColor,
                  }}
                >
                  <div>{label}</div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 6px",
                      background: colors.badgeColor,
                      color: colors.badgeTextColor,
                      borderRadius: 4,
                      fontSize: "0.85em",
                    }}
                  >
                    {i === 0 ? "Standard" : i === 1 ? "10% off" : "15% off"}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px",
                background: colors.primaryColor,
                color: "#fff",
                border: "none",
                borderRadius: `${colors.borderRadius}px`,
                cursor: "pointer",
              }}
            >
              Add bundle to cart
            </button>
          </div>
        </s-section>

        <s-button
          type="submit"
          variant="primary"
          {...(navigation.state === "submitting" ? { loading: true } : {})}
        >
          Save colors
        </s-button>
      </Form>

      <s-section slot="aside" heading="Theme setup">
        <s-paragraph>
          In your theme editor, add the <strong>Appify Bundle Widget</strong>{" "}
          block to product pages. Colors sync automatically from these settings.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
