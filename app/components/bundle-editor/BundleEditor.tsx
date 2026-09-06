import { Form, Link } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useState } from "react";
import type {
  BundleEditorState,
  EditorPanel,
  PickedProduct,
  PreviewProduct,
} from "../../types/bundle-editor";
import type { BundleEditorForm } from "../../hooks/useBundleEditorForm";
import { BundleEditorSidebar } from "./BundleEditorSidebar";
import { BundleEditorPreview } from "./BundleEditorPreview";
import "./bundle-editor.css";

type Props = {
  form: BundleEditorForm;
  products: PreviewProduct[];
  bundleId?: string;
  bundleTypeId: string;
  bundleStatus?: string;
  isSubmitting?: boolean;
};

export function BundleEditor({
  form,
  products,
  bundleId,
  bundleTypeId,
  bundleStatus = "draft",
  isSubmitting,
}: Props) {
  const shopify = useAppBridge();
  const state = form.watch();
  const onStateChange = (next: BundleEditorState) => form.replaceState(next);

  const [activePanel, setActivePanel] = useState<EditorPanel>("deal");
  const [expandedBarId, setExpandedBarId] = useState<string | null>(
    state.bars[1]?.id ?? state.bars[0]?.id ?? null,
  );
  const [selectedBarId, setSelectedBarId] = useState<string>(
    state.bars.find((b) => b.selectedByDefault)?.id ?? state.bars[0]?.id ?? "",
  );

  const fallbackProduct: PreviewProduct = {
    id: "preview-fallback",
    title: "The Collection Snowboard: Hydrogen",
    variantId: "preview-fallback-variant",
    price: 600,
    compareAtPrice: 750,
    currencyCode: "CAD",
  };
  const previewProduct =
    products.find((p) => p.id === state.previewProductId) ??
    products[0] ??
    fallbackProduct;

  const mapPicked = (product: {
    id: string;
    title: string;
    handle?: string;
    options?: Array<{ name?: string; values?: string[] }>;
    variants?: Array<{
      id?: string;
      title?: string;
      price?: string | number;
      compareAtPrice?: string | number | null;
      selectedOptions?: Array<{ name?: string; value?: string | null }>;
      availableForSale?: boolean;
    }>;
    images?: Array<{ originalSrc?: string; url?: string }>;
  }): PickedProduct => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    variantId: product.variants?.[0]?.id ?? product.id,
    imageUrl:
      product.images?.[0]?.originalSrc ?? product.images?.[0]?.url,
    price: Number(product.variants?.[0]?.price ?? 0) || undefined,
    compareAtPrice:
      Number(product.variants?.[0]?.compareAtPrice ?? 0) || undefined,
    options: (product.options || [])
      .filter((option) => option.name)
      .map((option) => ({
        name: option.name || "",
        values: option.values || [],
      })),
    variants: (product.variants || [])
      .filter((variant) => variant.id)
      .map((variant) => {
        const selected = (variant.selectedOptions || [])
          .map((option) => option.value || "")
          .filter(Boolean);
        return {
          id: String(variant.id),
          available: variant.availableForSale !== false,
          options: selected.length
            ? selected
            : String(variant.title || "")
                .split(" / ")
                .filter(Boolean),
        };
      }),
  });

  const toSelectionIds = (ids: string[]) =>
    ids.filter(Boolean).map((id) => ({ id }));

  const pickProduct = async (): Promise<PickedProduct | null> => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      action: "select",
    });
    if (!selected?.[0]) return null;
    return mapPicked(selected[0]);
  };

  const pickProducts = async () => {
    const current = form.getValues();
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      selectionIds: toSelectionIds(current.selectedProductIds),
    });
    if (!selected) return;
    onStateChange({
      ...current,
      selectedProductIds: selected.map((p) => p.id),
    });
  };

  const pickCollections = async () => {
    const current = form.getValues();
    const selected = await shopify.resourcePicker({
      type: "collection",
      multiple: true,
      action: "select",
      selectionIds: toSelectionIds(current.selectedCollectionIds),
    });
    if (!selected) return;
    onStateChange({
      ...current,
      selectedCollectionIds: selected.map((p) => p.id),
    });
  };

  const pickExceptionCollections = async () => {
    const current = form.getValues();
    const selected = await shopify.resourcePicker({
      type: "collection",
      multiple: true,
      action: "select",
      selectionIds: toSelectionIds(current.exceptionCollectionIds),
    });
    if (!selected) return;
    onStateChange({
      ...current,
      exceptionCollectionIds: selected.map((p) => p.id),
    });
  };

  const pickOfferItem = async (role: import("../../types/bundle-editor").OfferItemRole) => {
    const picked = await pickProduct();
    if (!picked) return;
    const current = form.getValues();
    const { createOfferItem } = await import("../../constants/bundle-editor-defaults");
    onStateChange({
      ...current,
      offerItems: [
        ...current.offerItems,
        createOfferItem({
          productId: picked.id,
          variantId: picked.variantId,
          handle: picked.handle,
          title: picked.title,
          imageUrl: picked.imageUrl,
          price: picked.price,
          compareAtPrice: picked.compareAtPrice,
          options: picked.options,
          variants: picked.variants,
          role,
          selectedByDefault: role === "addon" || role === "optional",
        }),
      ],
    });
  };

  const pickExceptions = async () => {
    const current = form.getValues();
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      selectionIds: toSelectionIds(current.exceptionProductIds),
    });
    if (!selected) return;
    onStateChange({
      ...current,
      exceptionProductIds: selected.map((p) => p.id),
    });
  };

  const handleSubmit = (intent: "draft" | "publish") => {
    const validation = form.getValidatedState();
    if (!validation.success && intent === "publish") {
      shopify.toast.show(validation.error, { isError: true });
      return false;
    }
    const el = document.getElementById("intent-field") as HTMLInputElement;
    if (el) el.value = intent;
    return true;
  };

  const editorStateJson = JSON.stringify(form.getValues());

  return (
    <div className="bundle-editor">
      <header className="bundle-editor__header">
        <Link to="/app/bundles" className="be-back-link">
          ←
        </Link>
        <h1 className="bundle-editor__header-title">Bundle deal</h1>
        <span className={`be-status-badge be-status-badge--${bundleStatus}`}>
          {bundleStatus}
        </span>
      </header>

      <div className="bundle-editor__body">
        <aside className="bundle-editor__sidebar">
          <BundleEditorSidebar
            state={state}
            onChange={onStateChange}
            expandedBarId={expandedBarId}
            onExpandBar={setExpandedBarId}
            onPickProducts={pickProducts}
            onPickExceptions={pickExceptions}
            onPickCollections={pickCollections}
            onPickExceptionCollections={pickExceptionCollections}
            onPickOfferItem={pickOfferItem}
            onPickProduct={pickProduct}
            bundleTypeId={bundleTypeId}
            activePanel={activePanel}
            onActivePanel={setActivePanel}
            errors={form.formState.errors}
          />
        </aside>

        <aside className="bundle-editor__preview-pane">
          <div className="be-preview-header">
            <h2>Preview</h2>
          </div>

          <div className="be-preview-controls">
            <div className="be-preview-control">
              <label htmlFor="preview-product">Product previewing</label>
              <select
                id="preview-product"
                value={previewProduct?.id ?? ""}
                onChange={(e) =>
                  onStateChange({
                    ...form.getValues(),
                    previewProductId: e.target.value,
                  })
                }
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.length > 35
                      ? p.title.slice(0, 35) + "…"
                      : p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="be-preview-control">
              <label htmlFor="preview-country">Country previewing</label>
              <select
                id="preview-country"
                value={state.previewCountry}
                onChange={(e) =>
                  onStateChange({
                    ...form.getValues(),
                    previewCountry: e.target.value,
                  })
                }
              >
                <option>Canada</option>
                <option>United States</option>
                <option>United Kingdom</option>
              </select>
            </div>
          </div>

          <div className="be-preview-card">
            <BundleEditorPreview
              state={state}
              product={previewProduct}
              selectedBarId={selectedBarId}
              onSelectBar={setSelectedBarId}
            />
          </div>
        </aside>
      </div>

      <Form method="post" className="bundle-editor__footer">
        <input type="hidden" name="intent" value="draft" id="intent-field" />
        <input type="hidden" name="editorState" value={editorStateJson} />
        <input type="hidden" name="bundleTypeId" value={bundleTypeId} />
        {bundleId && (
          <input type="hidden" name="bundleId" value={bundleId} />
        )}

        <button
          type="submit"
          className="be-btn-secondary"
          disabled={isSubmitting}
          onClick={(e) => {
            if (!handleSubmit("draft")) e.preventDefault();
          }}
        >
          {bundleStatus === "active" ? "Save changes" : "Save as draft"}
        </button>
        {(bundleStatus === "draft" ||
          bundleStatus === "paused" ||
          !bundleId) && (
          <button
            type="submit"
            className="be-btn-primary"
            disabled={isSubmitting}
            onClick={(e) => {
              if (!handleSubmit("publish")) e.preventDefault();
            }}
          >
            {bundleStatus === "paused" ? "Resume & publish" : "Publish"}
          </button>
        )}
        {bundleStatus === "active" && (
          <button
            type="submit"
            className="be-btn-primary"
            disabled={isSubmitting}
            onClick={(e) => {
              if (!handleSubmit("publish")) e.preventDefault();
            }}
          >
            Update live bundle
          </button>
        )}
      </Form>
    </div>
  );
}
