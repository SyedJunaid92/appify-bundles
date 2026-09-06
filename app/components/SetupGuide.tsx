import type { ReactNode } from "react";
import { useFetcher } from "react-router";
import { CreateBundleButton } from "./CreateBundleButton";

type Props = {
  themeEditorUrl: string;
  hasBundles: boolean;
  embedActive: boolean;
  dismissed: boolean;
};

function SetupStep({
  step,
  title,
  done,
  children,
}: {
  step: number;
  title: string;
  done: boolean;
  children?: ReactNode;
}) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="base">
      <div className="setup-guide-step">
        <span
          className={
            done
              ? "setup-guide-step__num setup-guide-step__num--done"
              : "setup-guide-step__num"
          }
        >
          {step}
        </span>
        <div className="setup-guide-step__body">
          <s-heading>{title}</s-heading>
          {done ? <s-badge tone="success">Completed</s-badge> : children}
        </div>
      </div>
    </s-box>
  );
}

export function SetupGuide({
  themeEditorUrl,
  hasBundles,
  embedActive,
  dismissed,
}: Props) {
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

          <SetupStep
            step={1}
            title="Activate Appify Bundles on your storefront"
            done={embedActive}
          >
            <s-paragraph>
              Activate the app embed by clicking the button below, then click{" "}
              <strong>Save</strong> on the theme editor page.
            </s-paragraph>
            <s-button href={themeEditorUrl} target="_blank" variant="primary">
              Activate app embed
            </s-button>
          </SetupStep>

          <SetupStep
            step={2}
            title="Create your first bundle deal"
            done={hasBundles}
          >
            <CreateBundleButton variant="secondary" />
          </SetupStep>
        </s-stack>
      </s-box>
    </s-section>
  );
}
