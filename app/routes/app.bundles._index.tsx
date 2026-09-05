import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  deleteBundle,
  listBundles,
  updateBundleStatus,
  getBundleById,
} from "../models/bundle.server";
import {
  formatBundleDiscountLabel,
  formatBundleTypeLabel,
} from "../utils/bundle-display";
import {
  ensureAutomaticBundleDiscount,
  syncBundleToShopify,
} from "../services/shopify-sync.server";
import {
  getBillingEnforcementState,
  isPublishingBlocked,
} from "../services/billing-enforcement.server";
import { BundleActionsMenu } from "../components/BundleActionsMenu";
import { CreateBundleButton } from "../components/CreateBundleButton";
import { useActionToast } from "../hooks/useActionToast";
import { createAbTestFromBundle } from "../services/experiment.server";
import { redirect } from "react-router";

const BUNDLE_ACTION_TOASTS: Record<string, string> = {
  delete: "Bundle deleted",
  pause: "Bundle paused",
  resume: "Bundle resumed on storefront",
  publish: "Bundle published to storefront",
  draft: "Bundle moved to draft",
};

const STATUS_TABS = [
  { key: "all", label: "All", href: "/app/bundles" },
  { key: "active", label: "Active", href: "/app/bundles?status=active" },
  { key: "paused", label: "Paused", href: "/app/bundles?status=paused" },
  { key: "draft", label: "Draft", href: "/app/bundles?status=draft" },
] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const bundles = await listBundles(session.shop, status);

  return { bundles, status: status ?? "all" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");

  if (!id) return { error: "Missing bundle id." };

  if (intent === "delete") {
    await deleteBundle(session.shop, id);
    return { ok: true, intent: "delete" };
  }

  if (intent === "pause") {
    await updateBundleStatus(session.shop, id, "paused");
    return { ok: true, intent: "pause" };
  }

  if (intent === "resume" || intent === "publish") {
    if (intent === "publish" || intent === "resume") {
      const enforcement = await getBillingEnforcementState(session.shop);
      if (isPublishingBlocked(enforcement)) {
        return {
          error:
            "Bundles are paused on your plan. Upgrade billing to publish again.",
        };
      }
    }

    const bundle = await getBundleById(session.shop, id);
    if (!bundle) return { error: "Bundle not found." };

    await updateBundleStatus(session.shop, id, "active");
    if (bundle.items.length > 0) {
      await syncBundleToShopify(admin, bundle);
    } else {
      await ensureAutomaticBundleDiscount(admin);
    }

    return { ok: true, intent };
  }

  if (intent === "draft") {
    await updateBundleStatus(session.shop, id, "draft");
    return { ok: true, intent: "draft" };
  }

  if (intent === "ab_test") {
    const result = await createAbTestFromBundle(session.shop, id);
    if ("error" in result && result.error) {
      return { error: result.error };
    }
    return redirect(`/app/bundles/${result.challengerId}/edit?toast=created`);
  }

  return { error: "Unknown action." };
};

export default function BundlesIndex() {
  const { bundles, status } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  useActionToast(actionData, BUNDLE_ACTION_TOASTS);

  return (
    <s-page heading="Bundles">
      <CreateBundleButton slot="primary-action" />

      <s-section>
        <div className="bundles-tabs">
          {STATUS_TABS.map((tab) => (
            <span
              key={tab.key}
              className={
                status === tab.key
                  ? "bundles-tabs__tab bundles-tabs__tab--active"
                  : "bundles-tabs__tab"
              }
            >
              <s-link href={tab.href}>{tab.label}</s-link>
            </span>
          ))}
        </div>
      </s-section>

      <s-section>
        {bundles.length === 0 ? (
          <div className="bundles-empty">
            <h2 className="bundles-empty__title">Create your first bundle</h2>
            <p className="bundles-empty__text">
              Offer volume discounts on product pages to increase average order
              value.
            </p>
            <CreateBundleButton variant="primary" />
          </div>
        ) : (
          <div className="bundles-table">
            <div className="bundles-table__head">
              <span>Bundle</span>
              <span>Offer</span>
              <span>Status</span>
              <span aria-hidden="true" />
            </div>
            {bundles.map((bundle) => (
              <div key={bundle.id} className="bundles-table__row">
                <div className="bundles-table__main">
                  <span className="bundles-table__title">
                    <s-link href={`/app/bundles/${bundle.id}/edit`}>
                      {bundle.title}
                    </s-link>
                  </span>
                  <span className="bundles-table__meta">
                    {bundle._count.items}{" "}
                    {bundle._count.items === 1 ? "product" : "products"} ·{" "}
                    {formatBundleTypeLabel(bundle.type)}
                  </span>
                </div>
                <div className="bundles-table__offer">
                  {formatBundleDiscountLabel({
                    discountType: bundle.discountType,
                    discountValue: bundle.discountValue,
                    type: bundle.type,
                    tiers: "tiers" in bundle ? bundle.tiers : [],
                  })}
                </div>
                <div className="bundles-table__status">
                  <span
                    className={`bundles-status bundles-status--${bundle.status}`}
                  >
                    {bundle.status}
                  </span>
                </div>
                <div className="bundles-table__actions">
                  <BundleActionsMenu
                    bundleId={bundle.id}
                    status={bundle.status}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
