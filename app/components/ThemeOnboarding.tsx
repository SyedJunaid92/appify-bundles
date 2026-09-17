import { useMemo, useState } from "react";
import {
  getThemeEditorAppBlockUrl,
  getThemeEditorEmbedUrl,
  themeRoleLabel,
  type StoreTheme,
} from "../utils/theme-editor";

type Props = {
  shop: string;
  apiKey: string;
  themes: StoreTheme[];
  embedActive: boolean;
};

function selectedValue(event: Event) {
  const target = event.currentTarget as HTMLElement & { value?: string };
  return target.value || "";
}

function EditorShot({ variant }: { variant: "embed" | "block" }) {
  if (variant === "embed") {
    return (
      <div className="theme-onboarding-shot" aria-hidden="true">
        <div className="theme-onboarding-shot__chrome">Theme editor</div>
        <div className="theme-onboarding-shot__sidebar">
          <div className="theme-onboarding-shot__nav">Theme settings</div>
          <div className="theme-onboarding-shot__nav is-active">App embeds</div>
          <div className="theme-onboarding-shot__card">
            <span>Appify Bundles</span>
            <span className="theme-onboarding-shot__toggle">On</span>
          </div>
          <div className="theme-onboarding-shot__save">Save</div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-onboarding-shot" aria-hidden="true">
      <div className="theme-onboarding-shot__chrome">Theme editor · Product</div>
      <div className="theme-onboarding-shot__sidebar">
        <div className="theme-onboarding-shot__nav is-active">Apps</div>
        <div className="theme-onboarding-shot__card">
          <span>Appify Bundle Widget</span>
          <span className="theme-onboarding-shot__reorder">↕</span>
        </div>
        <div className="theme-onboarding-shot__muted">Add block · Remove</div>
        <div className="theme-onboarding-shot__save">Save</div>
      </div>
    </div>
  );
}

export function ThemeOnboarding({ shop, apiKey, themes, embedActive }: Props) {
  const defaultThemeId = themes[0]?.id || "";
  const [themeId, setThemeId] = useState(defaultThemeId);
  const selected = themes.find((theme) => theme.id === themeId) ?? themes[0];
  const embedUrl = useMemo(
    () => getThemeEditorEmbedUrl(shop, apiKey, selected?.id),
    [shop, apiKey, selected?.id],
  );
  const appBlockUrl = useMemo(
    () => getThemeEditorAppBlockUrl(shop, apiKey, selected?.id),
    [shop, apiKey, selected?.id],
  );
  const vintage = Boolean(selected && !selected.isOs2);

  return (
    <s-stack direction="block" gap="base">
      {themes.length > 0 ? (
        <s-select
          label="Choose the theme to set up"
          name="themeId"
          value={themeId || selected?.id}
          onChange={(event: Event) => setThemeId(selectedValue(event))}
        >
          {themes.map((theme) => (
            <s-option key={theme.id} value={theme.id}>
              {theme.name} ({themeRoleLabel(theme.role)})
            </s-option>
          ))}
        </s-select>
      ) : (
        <s-paragraph>
          Open the theme editor from the buttons below. Instructions work with
          the published theme and any draft theme you pick in the editor.
        </s-paragraph>
      )}

      {vintage ? (
        <s-banner heading="Vintage theme" tone="warning">
          {selected?.name ?? "This theme"} does not use Online Store 2.0 JSON
          templates, so app blocks cannot be added. Activate the Appify Bundles
          app embed instead — embeds work on every Shopify theme, including
          vintage themes.
        </s-banner>
      ) : null}

      <s-box padding="base" borderWidth="base" borderRadius="base" background="base">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-heading>App embed (recommended)</s-heading>
            {embedActive ? <s-badge tone="success">Active on live theme</s-badge> : null}
          </s-stack>
          <s-paragraph>
            The app embed shows bundle offers on <s-text type="strong">product</s-text>{" "}
            and <s-text type="strong">cart</s-text> templates. Use the deep link to
            preview it with the embed already turned on, then click{" "}
            <s-text type="strong">Save</s-text>.
          </s-paragraph>
          <EditorShot variant="embed" />
          <s-ordered-list>
            <s-list-item>
              Click <s-text type="strong">Activate app embed</s-text> to open the
              theme editor with Appify Bundles enabled.
            </s-list-item>
            <s-list-item>
              Confirm the embed appears under Theme settings → App embeds.
            </s-list-item>
            <s-list-item>
              Preview a product page and the cart. The widget only renders on
              those templates.
            </s-list-item>
            <s-list-item>
              Click <s-text type="strong">Save</s-text> to publish. To turn it off
              later, toggle Appify Bundles off in App embeds and save again.
            </s-list-item>
            <s-list-item>
              Colors and typography are configured in the app under Widget, not
              in the theme editor.
            </s-list-item>
          </s-ordered-list>
          <s-button href={embedUrl} target="_blank" variant="primary">
            Activate app embed
          </s-button>
        </s-stack>
      </s-box>

      <s-box padding="base" borderWidth="base" borderRadius="base" background="base">
        <s-stack direction="block" gap="base">
          <s-heading>App block (optional placement)</s-heading>
          {vintage ? (
            <s-paragraph>
              App blocks require an Online Store 2.0 theme. Choose a different
              theme above, or keep using the app embed on this vintage theme.
            </s-paragraph>
          ) : (
            <>
              <s-paragraph>
                Use the app block when you want to place the widget in a specific
                product-page section. It is supported on{" "}
                <s-text type="strong">product</s-text> templates only.
              </s-paragraph>
              <EditorShot variant="block" />
              <s-ordered-list>
                <s-list-item>
                  Click <s-text type="strong">Add app block</s-text> to open the
                  product template with Appify Bundle Widget added.
                </s-list-item>
                <s-list-item>
                  Drag the block to reorder it, or click the eye / remove
                  controls to hide or delete it.
                </s-list-item>
                <s-list-item>
                  Select the block to review its settings. Visual styling is
                  edited in the app Widget page so the theme editor stays
                  uncluttered.
                </s-list-item>
                <s-list-item>
                  Preview the product page, then click{" "}
                  <s-text type="strong">Save</s-text>.
                </s-list-item>
              </s-ordered-list>
              <s-button href={appBlockUrl} target="_blank" variant="secondary">
                Add app block
              </s-button>
            </>
          )}
        </s-stack>
      </s-box>
    </s-stack>
  );
}
