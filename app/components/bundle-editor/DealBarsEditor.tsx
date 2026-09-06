import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { FieldErrors } from "react-hook-form";
import type {
  BarKind,
  BarProduct,
  BundleBar,
  BundleEditorState,
  PickedProduct,
  PriceType,
} from "../../types/bundle-editor";
import {
  ADDABLE_BAR_KINDS,
  createBar,
  createBarOfKind,
  createDefaultBarProduct,
} from "../../constants/bundle-editor-defaults";
import { BarFeatureEditor } from "./BarFeatureEditor";
import { VariableField } from "./VariablePicker";

type Props = {
  state: BundleEditorState;
  onChange: (state: BundleEditorState) => void;
  expandedBarId: string | null;
  onExpandBar: (id: string | null) => void;
  onPickProduct: () => Promise<PickedProduct | null>;
  errors?: FieldErrors<BundleEditorState>;
};

export function DealBarsEditor({
  state,
  onChange,
  expandedBarId,
  onExpandBar,
  onPickProduct,
  errors,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [menuBarId, setMenuBarId] = useState<string | null>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (addRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.(".be-portal-menu")) return;
      setAddOpen(false);
      setMenuBarId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const update = (patch: Partial<BundleEditorState>) =>
    onChange({ ...state, ...patch });

  const updateBar = (id: string, patch: Partial<BundleBar>) =>
    update({
      bars: state.bars.map((bar) => (bar.id === id ? { ...bar, ...patch } : bar)),
    });

  const moveBar = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= state.bars.length) return;
    const bars = [...state.bars];
    const [moved] = bars.splice(index, 1);
    bars.splice(next, 0, moved);
    update({ bars });
  };

  const duplicateBar = (id: string) => {
    const bar = state.bars.find((item) => item.id === id);
    if (!bar) return;
    const { id: _id, ...rest } = bar;
    const copy = createBar({
      ...rest,
      selectedByDefault: false,
    });
    const index = state.bars.findIndex((item) => item.id === id);
    const bars = [...state.bars];
    bars.splice(index + 1, 0, copy);
    update({ bars });
    onExpandBar(copy.id);
    setMenuBarId(null);
  };

  const removeBar = (id: string) => {
    if (state.bars.length <= 1) return;
    update({ bars: state.bars.filter((bar) => bar.id !== id) });
    setMenuBarId(null);
  };

  const addBar = (kind: BarKind) => {
    const bar = createBarOfKind(kind);
    update({ bars: [...state.bars, bar] });
    onExpandBar(bar.id);
    setAddOpen(false);
  };

  return (
    <div>
      {state.bars.map((bar, index) => {
        const kind = bar.kind || inferKind(bar, index);
        return (
          <div key={bar.id} className="be-bar-item">
            <div className="be-bar-item__header">
              <button
                type="button"
                className="be-bar-item__drag"
                aria-label="Move bar up"
                onClick={() => moveBar(index, -1)}
              >
                ⠿
              </button>
              <button
                type="button"
                className="be-bar-item__toggle"
                onClick={() =>
                  onExpandBar(expandedBarId === bar.id ? null : bar.id)
                }
              >
                <span className="be-bar-kind-icon" data-kind={kind}>
                  {kindIcon(kind)}
                </span>
                <span className="be-bar-item__name">
                  Bar #{index + 1} — {headerTitle(bar, index)}
                </span>
                <span className="be-bar-item__chevron">
                  {expandedBarId === bar.id ? "▾" : "▸"}
                </span>
              </button>
              <div className="be-bar-menu">
                <button
                  type="button"
                  className="be-bar-menu__trigger"
                  aria-label="Bar actions"
                  ref={(node) => {
                    menuRefs.current[bar.id] = node;
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setAddOpen(false);
                    setMenuBarId(menuBarId === bar.id ? null : bar.id);
                  }}
                >
                  ⋯
                </button>
              </div>
            </div>
            {expandedBarId === bar.id && (
              <div className="be-bar-item__body">
                <BarKindFields
                  bar={{ ...bar, kind }}
                  onUpdate={(patch) => updateBar(bar.id, patch)}
                  onPickProduct={onPickProduct}
                  titleError={
                    !bar.title?.trim() ? "Title is required" : undefined
                  }
                />
                <BarFeatureEditor
                  bar={bar}
                  onUpdate={(patch) => updateBar(bar.id, patch)}
                  onPickProduct={onPickProduct}
                />
                <div className="be-soldout-row">
                  <span>Show as Sold out</span>
                  <label className="be-switch">
                    <input
                      type="checkbox"
                      checked={bar.soldOut}
                      onChange={(e) =>
                        updateBar(bar.id, { soldOut: e.target.checked })
                      }
                    />
                    <span />
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {typeof errors?.bars?.message === "string" && (
        <p className="be-field-error" style={{ padding: "0 16px" }}>
          {errors.bars.message}
        </p>
      )}

      <div className="be-add-bar-wrap" ref={addRef}>
        <button
          type="button"
          ref={addButtonRef}
          className="be-add-bar be-add-bar--solid"
          onClick={() => {
            setMenuBarId(null);
            setAddOpen((open) => !open);
          }}
        >
          + Add bar
        </button>
      </div>

      {menuBarId && (
        <PortalMenu
          anchor={menuRefs.current[menuBarId]}
          align="end"
          width={160}
        >
          <button type="button" onClick={() => duplicateBar(menuBarId)}>
            Duplicate
          </button>
          <button
            type="button"
            className="be-bar-menu__danger"
            onClick={() => removeBar(menuBarId)}
          >
            Delete
          </button>
        </PortalMenu>
      )}

      {addOpen && (
        <PortalMenu anchor={addButtonRef.current} align="stretch" width={0}>
          {ADDABLE_BAR_KINDS.map((kind) => (
            <button key={kind.id} type="button" onClick={() => addBar(kind.id)}>
              <span className="be-bar-kind-icon" data-kind={kind.id}>
                {kindIcon(kind.id)}
              </span>
              {kind.title}
            </button>
          ))}
        </PortalMenu>
      )}
    </div>
  );
}

function PortalMenu({
  anchor,
  align,
  width,
  children,
}: {
  anchor: HTMLElement | null;
  align: "end" | "stretch";
  width: number;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });

  useLayoutEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuWidth = align === "stretch" ? rect.width : width || 160;
    const estimatedHeight = align === "stretch" ? 168 : 96;
    const openUp = window.innerHeight - rect.bottom < estimatedHeight + 12;
    const top = openUp
      ? Math.max(8, rect.top - estimatedHeight - 6)
      : rect.bottom + 6;
    const left =
      align === "stretch"
        ? rect.left
        : Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setPos({ top, left, width: menuWidth });
  }, [anchor, align, width]);

  if (!anchor) return null;

  return createPortal(
    <div
      className="be-portal-menu"
      role="menu"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {children}
    </div>,
    document.body,
  );
}

function BarKindFields({
  bar,
  onUpdate,
  onPickProduct,
  titleError,
}: {
  bar: BundleBar;
  onUpdate: (patch: Partial<BundleBar>) => void;
  onPickProduct: () => Promise<PickedProduct | null>;
  titleError?: string;
}) {
  if (bar.kind === "complete") {
    return (
      <>
        <div className="be-layout-toggle">
          <button
            type="button"
            className={bar.completeLayout === "stack" ? "active" : ""}
            onClick={() => onUpdate({ completeLayout: "stack" })}
            aria-label="Stacked layout"
          >
            ▤
          </button>
          <button
            type="button"
            className={bar.completeLayout !== "stack" ? "active" : ""}
            onClick={() => onUpdate({ completeLayout: "grid" })}
            aria-label="Grid layout"
          >
            ▦
          </button>
        </div>
        <VariableField
          label="Title"
          value={bar.title}
          error={titleError}
          onChange={(title) => onUpdate({ title })}
        />
        <VariableField
          label="Subtitle"
          value={bar.subtitle}
          onChange={(subtitle) => onUpdate({ subtitle })}
        />
        <VariableField
          label="Label"
          value={bar.label}
          onChange={(label) => onUpdate({ label })}
        />
        <label className="be-checkbox">
          <input
            type="checkbox"
            checked={bar.showProductsOnlyWhenSelected}
            onChange={(e) =>
              onUpdate({ showProductsOnlyWhenSelected: e.target.checked })
            }
          />
          Show products only when selected
        </label>
        <label className="be-checkbox">
          <input
            type="checkbox"
            checked={bar.showQuantitySelector}
            onChange={(e) =>
              onUpdate({ showQuantitySelector: e.target.checked })
            }
          />
          Show quantity selector
        </label>
        <label className="be-checkbox">
          <input
            type="checkbox"
            checked={bar.requireVariantSelection}
            onChange={(e) =>
              onUpdate({ requireVariantSelection: e.target.checked })
            }
          />
          Require variant selection
        </label>
        <label className="be-checkbox">
          <input
            type="checkbox"
            checked={bar.selectedByDefault}
            onChange={(e) => onUpdate({ selectedByDefault: e.target.checked })}
          />
          Selected by default
        </label>
        <CompleteProducts
          bar={bar}
          onUpdate={onUpdate}
          onPickProduct={onPickProduct}
        />
      </>
    );
  }

  if (bar.kind === "bogo") {
    return (
      <>
        <div className="be-field-row">
          <div className="be-field">
            <label>Buy</label>
            <input
              type="number"
              min={1}
              value={bar.buyQty}
              onChange={(e) =>
                onUpdate({
                  buyQty: Number(e.target.value),
                  quantity: Number(e.target.value),
                })
              }
            />
          </div>
          <PriceFields
            priceType={bar.priceType}
            discountValue={bar.discountValue}
            onChange={onUpdate}
          />
        </div>
        <div className="be-field-row">
          <div className="be-field">
            <label>Get</label>
            <input
              type="number"
              min={1}
              value={bar.getQty}
              onChange={(e) => onUpdate({ getQty: Number(e.target.value) })}
            />
          </div>
          <PriceFields
            label="Price"
            priceType={bar.getPriceType}
            discountValue={bar.getDiscountValue}
            onChange={(patch) =>
              onUpdate({
                getPriceType: patch.priceType ?? bar.getPriceType,
                getDiscountValue: patch.discountValue ?? bar.getDiscountValue,
              })
            }
          />
        </div>
        <VariableField
          label="Title"
          value={bar.title}
          error={titleError}
          onChange={(title) => onUpdate({ title })}
        />
        <VariableField
          label="Subtitle"
          value={bar.subtitle}
          onChange={(subtitle) => onUpdate({ subtitle })}
        />
        <VariableField
          label="Label"
          value={bar.label}
          onChange={(label) => onUpdate({ label })}
        />
        <label className="be-checkbox">
          <input
            type="checkbox"
            checked={bar.selectedByDefault}
            onChange={(e) => onUpdate({ selectedByDefault: e.target.checked })}
          />
          Selected by default
        </label>
      </>
    );
  }

  return (
    <>
      <div className="be-field-row">
        <div className="be-field">
          <label>Quantity</label>
          <input
            type="number"
            min={1}
            value={bar.quantity}
            onChange={(e) => onUpdate({ quantity: Number(e.target.value) })}
          />
        </div>
        <PriceFields
          priceType={bar.priceType}
          discountValue={bar.discountValue}
          onChange={onUpdate}
        />
      </div>
      <VariableField
        label="Title"
        value={bar.title}
        error={titleError}
        onChange={(title) => onUpdate({ title })}
      />
      <VariableField
        label="Subtitle"
        value={bar.subtitle}
        onChange={(subtitle) => onUpdate({ subtitle })}
      />
      <VariableField
        label="Label"
        value={bar.label}
        onChange={(label) => onUpdate({ label })}
      />
      <label className="be-checkbox">
        <input
          type="checkbox"
          checked={bar.showQuantitySelector}
          onChange={(e) => onUpdate({ showQuantitySelector: e.target.checked })}
        />
        Show quantity selector
      </label>
      <label className="be-checkbox">
        <input
          type="checkbox"
          checked={bar.selectedByDefault}
          onChange={(e) => onUpdate({ selectedByDefault: e.target.checked })}
        />
        Selected by default
      </label>
    </>
  );
}

function CompleteProducts({
  bar,
  onUpdate,
  onPickProduct,
}: {
  bar: BundleBar;
  onUpdate: (patch: Partial<BundleBar>) => void;
  onPickProduct: () => Promise<PickedProduct | null>;
}) {
  const products = bar.products?.length
    ? bar.products
    : [createDefaultBarProduct()];

  const updateProduct = (id: string, patch: Partial<BarProduct>) =>
    onUpdate({
      products: products.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });

  const addProduct = async () => {
    const picked = await onPickProduct();
    if (!picked) return;
    onUpdate({
      products: [
        ...products,
        createDefaultBarProduct({
          isDefault: false,
          productId: picked.id,
          variantId: picked.variantId,
          handle: picked.handle,
          title: picked.title,
          imageUrl: picked.imageUrl,
          price: picked.price,
          compareAtPrice: picked.compareAtPrice,
          options: picked.options,
          variants: picked.variants,
        }),
      ],
    });
  };

  return (
    <div className="be-complete-products">
      {products.map((item) => (
        <div key={item.id} className="be-complete-product">
          <div className="be-complete-product__top">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" />
            ) : (
              <span className="be-complete-product__ph" />
            )}
            <strong>{item.isDefault ? "Default product" : item.title}</strong>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                updateProduct(item.id, { quantity: Number(e.target.value) })
              }
            />
            {!item.isDefault && (
              <button
                type="button"
                className="be-icon-btn"
                onClick={() =>
                  onUpdate({
                    products: products.filter((product) => product.id !== item.id),
                  })
                }
              >
                ⌫
              </button>
            )}
          </div>
          <div className="be-field-row">
            <div className="be-field">
              <label>Price</label>
              <select
                value={item.priceType}
                onChange={(e) =>
                  updateProduct(item.id, {
                    priceType: e.target.value as PriceType,
                  })
                }
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="full">Full price</option>
              </select>
            </div>
            {item.priceType !== "full" && (
              <div className="be-field">
                <label>Discount per item</label>
                <div className="be-input-suffix">
                  <input
                    type="number"
                    min={0}
                    value={item.discountValue}
                    onChange={(e) =>
                      updateProduct(item.id, {
                        discountValue: Number(e.target.value),
                      })
                    }
                  />
                  <span>{item.priceType === "percentage" ? "%" : "$"}</span>
                </div>
              </div>
            )}
          </div>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={item.hidePrice}
              onChange={(e) =>
                updateProduct(item.id, { hidePrice: e.target.checked })
              }
            />
            Hide price
          </label>
          <VariableField
            label="Title"
            value={item.titleTemplate}
            onChange={(titleTemplate) => updateProduct(item.id, { titleTemplate })}
          />
        </div>
      ))}
      <button type="button" className="be-add-bar" onClick={addProduct}>
        + Add product
      </button>
    </div>
  );
}

function PriceFields({
  label = "Price",
  priceType,
  discountValue,
  onChange,
}: {
  label?: string;
  priceType: PriceType;
  discountValue: number;
  onChange: (patch: { priceType?: PriceType; discountValue?: number }) => void;
}) {
  return (
    <>
      <div className="be-field">
        <label>{label}</label>
        <select
          value={priceType}
          onChange={(e) =>
            onChange({ priceType: e.target.value as PriceType })
          }
        >
          <option value="full">Full price</option>
          <option value="percentage">Percentage off</option>
          <option value="fixed">Fixed amount off</option>
        </select>
      </div>
      {priceType !== "full" && (
        <div className="be-field">
          <label>Discount per item</label>
          <div className="be-input-suffix">
            <input
              type="number"
              min={0}
              value={discountValue}
              onChange={(e) =>
                onChange({ discountValue: Number(e.target.value) })
              }
            />
            <span>{priceType === "percentage" ? "%" : "$"}</span>
          </div>
        </div>
      )}
    </>
  );
}

function inferKind(bar: BundleBar, index: number): BarKind {
  if (bar.kind) return bar.kind;
  if (index === 1) return "complete";
  if (index === 2) return "quantity_break";
  if (index === 3) return "bogo";
  return "product";
}

function headerTitle(bar: BundleBar, index: number) {
  if (bar.kind === "complete" || (!bar.kind && index === 1)) {
    return bar.title || "Complete the bundle";
  }
  return bar.title || "{{product}}";
}

function kindIcon(kind: BarKind) {
  if (kind === "bogo") return "📢";
  if (kind === "complete") return "🏷";
  return "%";
}
