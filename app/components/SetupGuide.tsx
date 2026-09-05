import { useFetcher } from "react-router";
import { CreateBundleButton } from "./CreateBundleButton";

type Props = {
  themeEditorUrl: string;
  hasBundles: boolean;
  dismissed: boolean;
};

export function SetupGuide({ themeEditorUrl, hasBundles, dismissed }: Props) {
  const fetcher = useFetcher();

  if (dismissed) return null;

  return (
    <s-section>
      <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-heading>Setup guide</s-heading>
            <fetcher.Form method="post" action="/app/setup" style={{ marginLeft: "auto" }}>
              <input type="hidden" name="intent" value="dismiss" />
              <s-button type="submit" variant="tertiary">
                ✕
              </s-button>
            </fetcher.Form>
          </s-stack>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="base">
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="base">
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a1a1a", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>1</span>
                <s-heading>Activate Appify Bundles on your storefront</s-heading>
              </s-stack>
              <s-paragraph>
                Activate the app embed by clicking the button below, then click{" "}
                <strong>Save</strong> on the theme editor page.
              </s-paragraph>
              <s-button
                href={themeEditorUrl}
                target="_blank"
                variant="primary"
              >
                Activate app embed
              </s-button>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="base">
            <s-stack direction="inline" gap="base">
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: hasBundles ? "#1a1a1a" : "#e1e3e5", color: hasBundles ? "#fff" : "#6d7175", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>2</span>
              <s-stack direction="block" gap="small">
                <s-heading>Create your first bundle deal</s-heading>
                {!hasBundles && (
                  <CreateBundleButton variant="secondary" />
                )}
                {hasBundles && <s-badge tone="success">Completed</s-badge>}
              </s-stack>
            </s-stack>
          </s-box>
        </s-stack>
      </s-box>
    </s-section>
  );
}
