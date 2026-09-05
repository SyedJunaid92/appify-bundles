import type {
  BundleEditorState,
  EditorPanel,
  OfferItemRole,
  PickedProduct,
} from "../../types/bundle-editor";
import type { FieldErrors } from "react-hook-form";
import { Accordion } from "./Accordion";
import { DealBarsEditor } from "./DealBarsEditor";
import { StylePanel } from "./StylePanel";
import { BarBadgesEditor } from "./BarBadgesEditor";
import { resolveBundleTypeId } from "../../constants/bundle-types";

type Props = {
  state: BundleEditorState;
  onChange: (state: BundleEditorState) => void;
  expandedBarId: string | null;
  onExpandBar: (id: string | null) => void;
  onPickProducts: () => void;
  onPickExceptions: () => void;
  onPickCollections: () => void;
  onPickExceptionCollections: () => void;
  onPickOfferItem: (role: OfferItemRole) => Promise<void> | void;
  onPickProduct: () => Promise<PickedProduct | null>;
  activePanel: EditorPanel;
  onActivePanel: (panel: EditorPanel) => void;
  errors?: FieldErrors<BundleEditorState>;
  bundleTypeId?: string;
};

export function BundleEditorSidebar({
  state,
  onChange,
  expandedBarId,
  onExpandBar,
  onPickProducts,
  onPickExceptions,
  onPickCollections,
  onPickExceptionCollections,
  onPickOfferItem,
  onPickProduct,
  activePanel,
  onActivePanel,
  errors,
  bundleTypeId,
}: Props) {
  const typeId = resolveBundleTypeId(bundleTypeId || state.bundleTypeId);
  const update = (patch: Partial<BundleEditorState>) =>
    onChange({ ...state, ...patch });

  const updateSettings = (patch: Partial<BundleEditorState["settings"]>) =>
    update({ settings: { ...state.settings, ...patch } });

  const updateStyle = (patch: Partial<BundleEditorState["style"]>) =>
    update({ style: { ...state.style, ...patch } });

  if (activePanel === "bar") {
    return (
      <div>
        <PanelTabs active={activePanel} onChange={onActivePanel} />
        <BarBadgesEditor state={state} onChange={onChange} />
      </div>
    );
  }

  if (activePanel === "settings") {
    return (
      <div>
        <PanelTabs active={activePanel} onChange={onActivePanel} />
        <Accordion title="General" defaultOpen>
          <div className="be-field">
            <label htmlFor="internalName">Name (only visible for you)</label>
            <input
              id="internalName"
              value={state.internalName}
              onChange={(e) => update({ internalName: e.target.value })}
              aria-invalid={errors?.internalName ? true : undefined}
            />
            {errors?.internalName && (
              <span className="be-field-error">{errors.internalName.message}</span>
            )}
          </div>
          <div className="be-field">
            <label htmlFor="blockTitle">Block title</label>
            <input
              id="blockTitle"
              value={state.blockTitle}
              onChange={(e) => update({ blockTitle: e.target.value })}
              aria-invalid={errors?.blockTitle ? true : undefined}
            />
            {errors?.blockTitle && (
              <span className="be-field-error">{errors.blockTitle.message}</span>
            )}
          </div>
          <div className="be-field">
            <label htmlFor="discountName">Discount name</label>
            <input
              id="discountName"
              value={state.discountName}
              onChange={(e) => update({ discountName: e.target.value })}
              placeholder="Shown in cart / checkout"
            />
          </div>
        </Accordion>
        <Accordion title="Targeting & schedule" defaultOpen>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={state.settings.discountViaWidgetOnly}
              onChange={(e) =>
                updateSettings({ discountViaWidgetOnly: e.target.checked })
              }
            />
            Discount only when added from this widget
          </label>
          <div className="be-field">
            <label>B2B customers</label>
            <select
              value={
                state.settings.b2bOnly
                  ? "only"
                  : state.settings.excludeB2b
                    ? "exclude"
                    : "off"
              }
              onChange={(e) =>
                updateSettings({
                  b2bOnly: e.target.value === "only",
                  excludeB2b: e.target.value === "exclude",
                })
              }
            >
              <option value="off">All customers</option>
              <option value="exclude">Exclude B2B</option>
              <option value="only">B2B only</option>
            </select>
          </div>
          <div className="be-field-row">
            <div className="be-field">
              <label>Start date</label>
              <input
                type="date"
                value={state.settings.startDate}
                onChange={(e) => updateSettings({ startDate: e.target.value })}
              />
            </div>
            <div className="be-field">
              <label>Start time</label>
              <input
                type="time"
                value={state.settings.startTime}
                onChange={(e) => updateSettings({ startTime: e.target.value })}
              />
            </div>
          </div>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={state.settings.hasEndDate}
              onChange={(e) => updateSettings({ hasEndDate: e.target.checked })}
            />
            Set an end date
          </label>
          {state.settings.hasEndDate && (
            <div className="be-field-row">
              <div className="be-field">
                <label>End date</label>
                <input
                  type="date"
                  value={state.settings.endDate}
                  onChange={(e) => updateSettings({ endDate: e.target.value })}
                />
              </div>
              <div className="be-field">
                <label>End time</label>
                <input
                  type="time"
                  value={state.settings.endTime}
                  onChange={(e) => updateSettings({ endTime: e.target.value })}
                />
              </div>
            </div>
          )}
          {(typeId === "fbt_upsell" || typeId === "gifts") && (
            <div className="be-field">
              <label>Placement</label>
              <select
                value={state.placement}
                onChange={(e) =>
                  update({
                    placement: e.target.value as BundleEditorState["placement"],
                  })
                }
              >
                <option value="product">Product page</option>
                <option value="cart">Cart</option>
                <option value="both">Product and cart</option>
              </select>
            </div>
          )}
        </Accordion>
        <Accordion title="Pricing" defaultOpen>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={state.settings.useCompareAtPrice}
              onChange={(e) =>
                updateSettings({ useCompareAtPrice: e.target.checked })
              }
            />
            Use product compare-at price
          </label>
          <p className="be-field-hint">
            On: show the product compare-at price when available. Off: show the
            product price.
          </p>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={state.settings.showPricePerItem}
              onChange={(e) =>
                updateSettings({ showPricePerItem: e.target.checked })
              }
            />
            Show prices per item
          </label>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={state.settings.showPriceWithoutDecimals}
              onChange={(e) =>
                updateSettings({ showPriceWithoutDecimals: e.target.checked })
              }
            />
            Show prices without decimals
          </label>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={state.settings.priceRounding}
              onChange={(e) =>
                updateSettings({ priceRounding: e.target.checked })
              }
            />
            Price rounding
          </label>
        </Accordion>
      </div>
    );
  }

  if (activePanel === "style") {
    return (
      <div>
        <PanelTabs active={activePanel} onChange={onActivePanel} />
        <StylePanel style={state.style} onChange={updateStyle} />
      </div>
    );
  }

  return (
    <div>
      <PanelTabs active={activePanel} onChange={onActivePanel} />

      <Accordion title="Products" defaultOpen>
        <div className="be-radio-group">
          {(
            [
              ["all", "All products"],
              ["selected", "Selected products"],
              ["collections", "Collections"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="be-radio">
              <input
                type="radio"
                name="productScope"
                checked={state.productScope === value}
                onChange={() => update({ productScope: value })}
              />
              {label}
            </label>
          ))}
        </div>
        {state.productScope === "selected" && (
          <button type="button" className="be-add-bar" onClick={onPickProducts}>
            Select products ({state.selectedProductIds.length})
          </button>
        )}
        {state.productScope === "collections" && (
          <button type="button" className="be-add-bar" onClick={onPickCollections}>
            Select collections ({state.selectedCollectionIds.length})
          </button>
        )}
        <button
          type="button"
          className="be-add-bar"
          style={{ marginTop: 8 }}
          onClick={onPickExceptions}
        >
          Product exceptions ({state.exceptionProductIds.length})
        </button>
        <button
          type="button"
          className="be-add-bar"
          style={{ marginTop: 8 }}
          onClick={onPickExceptionCollections}
        >
          Collection exceptions ({state.exceptionCollectionIds.length})
        </button>
      </Accordion>

      <TypeDealFields
        typeId={typeId}
        state={state}
        update={update}
        onPickOfferItem={onPickOfferItem}
      />

      <DealBarsEditor
        state={state}
        onChange={onChange}
        expandedBarId={expandedBarId}
        onExpandBar={onExpandBar}
        onPickProduct={onPickProduct}
        errors={errors}
      />
    </div>
  );
}

function PanelTabs({
  active,
  onChange,
}: {
  active: EditorPanel;
  onChange: (p: EditorPanel) => void;
}) {
  return (
    <div className="be-panel-tabs">
      {(
        [
          ["deal", "Bundle deal"],
          ["settings", "Settings"],
          ["style", "Style"],
          ["bar", "Bar"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={active === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TypeDealFields({
  typeId,
  state,
  update,
  onPickOfferItem,
}: {
  typeId: string;
  state: BundleEditorState;
  update: (patch: Partial<BundleEditorState>) => void;
  onPickOfferItem: (role: OfferItemRole) => Promise<void> | void;
}) {
  const removeItem = (id: string) =>
    update({ offerItems: state.offerItems.filter((item) => item.id !== id) });

  if (typeId === "bogo") {
    return (
      <Accordion title="BOGO rules" defaultOpen>
        <div className="be-field-row">
          <div className="be-field">
            <label>Buy quantity</label>
            <input
              type="number"
              min={1}
              value={state.bogoBuyQty}
              onChange={(e) => update({ bogoBuyQty: Number(e.target.value) })}
            />
          </div>
          <div className="be-field">
            <label>Get quantity</label>
            <input
              type="number"
              min={1}
              value={state.bogoGetQty}
              onChange={(e) => update({ bogoGetQty: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="be-field">
          <label>Max redemptions (0 = unlimited)</label>
          <input
            type="number"
            min={0}
            value={state.bogoMaxRedemptions}
            onChange={(e) => update({ bogoMaxRedemptions: Number(e.target.value) })}
          />
        </div>
      </Accordion>
    );
  }

  if (typeId === "mix_match") {
    return (
      <Accordion title="Mix & match pool" defaultOpen>
        <div className="be-field-row">
          <div className="be-field">
            <label>Min items</label>
            <input
              type="number"
              min={2}
              value={state.minItems}
              onChange={(e) => update({ minItems: Number(e.target.value) })}
            />
          </div>
          <div className="be-field">
            <label>Max items</label>
            <input
              type="number"
              min={0}
              placeholder="No limit"
              value={state.maxItems ?? ""}
              onChange={(e) =>
                update({
                  maxItems: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
        <OfferItemList
          items={state.offerItems}
          onRemove={removeItem}
          onAdd={() => onPickOfferItem("pool")}
          addLabel="Add pool product"
        />
      </Accordion>
    );
  }

  if (typeId === "fbt_upsell") {
    return (
      <Accordion title="Add-on products" defaultOpen>
        <div className="be-field">
          <label>Discount mode</label>
          <select
            value={state.fbtMode}
            onChange={(e) =>
              update({ fbtMode: e.target.value as BundleEditorState["fbtMode"] })
            }
          >
            <option value="addons">Discount add-ons only</option>
            <option value="combo">Discount the whole combo</option>
          </select>
        </div>
        {state.fbtMode === "combo" && (
          <div className="be-field">
            <label>Minimum selected</label>
            <input
              type="number"
              min={2}
              value={state.fbtMinSelect}
              onChange={(e) => update({ fbtMinSelect: Number(e.target.value) })}
            />
          </div>
        )}
        <OfferItemList
          items={state.offerItems}
          onRemove={removeItem}
          onAdd={() => onPickOfferItem("addon")}
          addLabel="Add frequently bought product"
        />
      </Accordion>
    );
  }

  if (typeId === "gifts") {
    return (
      <Accordion title="Gift unlock" defaultOpen>
        <div className="be-field">
          <label>Threshold type</label>
          <select
            value={state.giftThresholdType}
            onChange={(e) =>
              update({
                giftThresholdType: e.target
                  .value as BundleEditorState["giftThresholdType"],
              })
            }
          >
            <option value="subtotal">Cart subtotal</option>
            <option value="quantity">Item count</option>
          </select>
        </div>
        <div className="be-field">
          <label>Unlock at</label>
          <input
            type="number"
            min={1}
            value={state.giftThresholdValue}
            onChange={(e) =>
              update({ giftThresholdValue: Number(e.target.value) })
            }
          />
        </div>
        <label className="be-checkbox">
          <input
            type="checkbox"
            checked={state.giftFreeShipping}
            onChange={(e) => update({ giftFreeShipping: e.target.checked })}
          />
          Also unlock free shipping
        </label>
        <OfferItemList
          items={state.offerItems}
          onRemove={removeItem}
          onAdd={() => onPickOfferItem("gift")}
          addLabel="Add gift product"
        />
      </Accordion>
    );
  }

  return null;
}

function OfferItemList({
  items,
  onRemove,
  onAdd,
  addLabel,
}: {
  items: BundleEditorState["offerItems"];
  onRemove: (id: string) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div>
      {items.map((item) => (
        <div key={item.id} className="be-bar-item__header" style={{ marginTop: 8 }}>
          <span style={{ flex: 1 }}>
            {item.title || "Product"} · {item.role}
          </span>
          <button type="button" onClick={() => onRemove(item.id)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="be-add-bar" onClick={onAdd}>
        {addLabel}
      </button>
    </div>
  );
}

