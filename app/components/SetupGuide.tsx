import type { ReactNode } from "react";
import { useFetcher } from "react-router";
import { CreateBundleButton } from "./CreateBundleButton";
import { ThemeOnboarding } from "./ThemeOnboarding";
import type { StoreTheme } from "../utils/theme-editor";

type Props = {
  shop: string;
  apiKey: string;
  themes: StoreTheme[];
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
          <s-stack direction="inline" gap="base">
            <s-heading>{title}</s-heading>
            {done ? <s-badge tone="success">Completed</s-badge> : null}
          </s-stack>
          {children}
        </div>
      </div>
    </s-box>
  );
}

export function SetupGuide({
  shop,
  apiKey,
  themes,
  hasBundles,
  embedActive,
  dismissed,
}: Props) {
  const fetcher = useFetcher();

  if (dismissed) return null;

  return (
    <s-section heading="Setup guide">
      <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
        <s-stack direction="block" gap="base">
          <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="start">
            <s-paragraph>
              Add Appify Bundles to your theme, then create a deal. You can
              preview every change in the theme editor before saving.
            </s-paragraph>
            <fetcher.Form method="post" action="/app/setup">
              <input type="hidden" name="intent" value="dismiss" />
              <s-button
                type="submit"
                variant="tertiary"
                accessibilityLabel="Dismiss setup guide"
                icon="x"
              />
            </fetcher.Form>
          </s-grid>

          <SetupStep
            step={1}
            title="Add Appify Bundles to your theme"
            done={embedActive}
          >
            <ThemeOnboarding
              shop={shop}
              apiKey={apiKey}
              themes={themes}
              embedActive={embedActive}
            />
          </SetupStep>

          <SetupStep
            step={2}
            title="Create your first bundle deal"
            done={hasBundles}
          >
            {hasBundles ? null : <CreateBundleButton variant="secondary" />}
          </SetupStep>
        </s-stack>
      </s-box>
    </s-section>
  );
}
