import type {
  BarGift,
  BarHighlights,
  BarImage,
  BarPersonalisation,
  BarUpsell,
  BundleBar,
  PickedProduct,
} from "../../types/bundle-editor";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultUpsell(): BarUpsell {
  return {
    productMode: "selected",
    priceType: "percentage",
    discountValue: 20,
    text: "+ Add at {{saved_percentage}} discount",
    imageSize: 30,
    selectedByDefault: false,
    visibleWhenSelected: false,
    enableSubscription: true,
    subscriptionMode: "Follow deal subscription",
  };
}

export function defaultGift(type: "product" | "shipping" = "product"): BarGift {
  return {
    id: newId("gift"),
    type,
    text: type === "shipping" ? "+ FREE Shipping" : "+ FREE Gift",
    imageSize: 30,
    showOriginalPrice: true,
    includeInCompareAt: false,
    subscriptionsOnly: false,
  };
}

export function defaultImage(): BarImage {
  return { size: 40 };
}

export function defaultPersonalisation(): BarPersonalisation {
  return {
    label: "Personalisation",
    placeholder: "Enter your text",
    required: false,
    maxLength: 100,
  };
}

export function defaultHighlights(): BarHighlights {
  return {
    items: [{ id: newId("hl"), text: "Free shipping" }],
    layout: "vertical",
    showOnlyWhenSelected: false,
    size: 16,
    textColor: "#202223",
    iconType: "checkmark",
    iconColor: "#202223",
  };
}

type Props = {
  bar: BundleBar;
  onUpdate: (patch: Partial<BundleBar>) => void;
  onPickProduct: () => Promise<PickedProduct | null>;
};

export function BarFeatureEditor({ bar, onUpdate, onPickProduct }: Props) {
  const addUpsell = () => onUpdate({ upsell: defaultUpsell() });
  const addGift = (type: "product" | "shipping" = "product") =>
    onUpdate({ gifts: [...(bar.gifts ?? []), defaultGift(type)] });
  const addImage = () => onUpdate({ image: defaultImage() });
  const addFeaturedImage = () =>
    onUpdate({ image: { url: "{{featured_image}}", size: 40 } });
  const addPersonalisation = () =>
    onUpdate({ personalisation: defaultPersonalisation() });
  const addHighlights = () => onUpdate({ highlights: defaultHighlights() });

  const pickForUpsell = async () => {
    const product = await onPickProduct();
    if (!product || !bar.upsell) return;
    onUpdate({
      upsell: {
        ...bar.upsell,
        productId: product.id,
        productTitle: product.title,
        variantId: product.variantId,
        imageUrl: product.imageUrl,
      },
    });
  };

  const pickForGift = async (giftId: string) => {
    const product = await onPickProduct();
    if (!product) return;
    onUpdate({
      gifts: (bar.gifts ?? []).map((g) =>
        g.id === giftId
          ? {
              ...g,
              productId: product.id,
              productTitle: product.title,
              variantId: product.variantId,
              imageUrl: product.imageUrl,
            }
          : g,
      ),
    });
  };

  return (
    <>
      <div className="be-action-grid">
        {!bar.image && (
          <button type="button" className="be-action-btn" onClick={addImage}>
            <span className="be-action-btn__icon">🖼</span>
            Add image
          </button>
        )}
        {!bar.image && (
          <button type="button" className="be-action-btn" onClick={addFeaturedImage}>
            <span className="be-action-btn__icon">🏷</span>
            Featured image
          </button>
        )}
        {!bar.upsell && (
          <button type="button" className="be-action-btn" onClick={addUpsell}>
            <span className="be-action-btn__icon">↗</span>
            Add upsell
          </button>
        )}
        <div className="be-gift-dropdown">
          <button type="button" className="be-action-btn" onClick={() => addGift("product")}>
            <span className="be-action-btn__icon">🎁</span>
            Add gift
            <span className="be-gift-dropdown__chevron">▾</span>
          </button>
          <div className="be-gift-dropdown__menu">
            <button type="button" onClick={() => addGift("product")}>
              Free gift
            </button>
            <button type="button" onClick={() => addGift("shipping")}>
              Free shipping
            </button>
          </div>
        </div>
        {!bar.personalisation && (
          <button
            type="button"
            className="be-action-btn"
            onClick={addPersonalisation}
          >
            <span className="be-action-btn__icon">✎</span>
            Add personalisation
          </button>
        )}
        {!bar.highlights && (
          <button
            type="button"
            className="be-action-btn be-action-btn--wide"
            onClick={addHighlights}
          >
            <span className="be-action-btn__icon">✓</span>
            Add highlights
          </button>
        )}
      </div>

      {bar.image && (
        <FeatureCard
          title="Image"
          onRemove={() => onUpdate({ image: null })}
        >
          <div className="be-field">
            <label>Image URL</label>
            <input
              value={bar.image.url ?? ""}
              placeholder="https://..."
              onChange={(e) =>
                onUpdate({ image: { ...bar.image!, url: e.target.value } })
              }
            />
          </div>
          <SliderField
            label="Image size"
            value={bar.image.size}
            min={20}
            max={80}
            onChange={(v) => onUpdate({ image: { ...bar.image!, size: v } })}
          />
        </FeatureCard>
      )}

      {bar.upsell && (
        <FeatureCard
          title="Upsell"
          onRemove={() => onUpdate({ upsell: null })}
        >
          <div className="be-radio-group be-radio-group--inline">
            <label className="be-radio">
              <input
                type="radio"
                checked={bar.upsell.productMode === "selected"}
                onChange={() =>
                  onUpdate({
                    upsell: { ...bar.upsell!, productMode: "selected" },
                  })
                }
              />
              Selected product
            </label>
            <label className="be-radio">
              <input
                type="radio"
                checked={bar.upsell.productMode === "complementary"}
                onChange={() =>
                  onUpdate({
                    upsell: { ...bar.upsell!, productMode: "complementary" },
                  })
                }
              />
              Complementary product
            </label>
          </div>
          <button
            type="button"
            className="be-btn-primary"
            onClick={pickForUpsell}
          >
            {bar.upsell.productTitle ?? "Select a product"}
          </button>
          {bar.upsell.productTitle && (
            <div className="be-selected-product">
              {bar.upsell.imageUrl && (
                <img src={bar.upsell.imageUrl} alt="" />
              )}
              <span>{bar.upsell.productTitle}</span>
            </div>
          )}
          <div className="be-field-row">
            <div className="be-field">
              <label>Price</label>
              <select
                value={bar.upsell.priceType}
                onChange={(e) =>
                  onUpdate({
                    upsell: {
                      ...bar.upsell!,
                      priceType: e.target.value as BarUpsell["priceType"],
                    },
                  })
                }
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </div>
            <div className="be-field">
              <label>Discount per item</label>
              <div className="be-input-suffix">
                <input
                  type="number"
                  min={0}
                  value={bar.upsell.discountValue}
                  onChange={(e) =>
                    onUpdate({
                      upsell: {
                        ...bar.upsell!,
                        discountValue: Number(e.target.value),
                      },
                    })
                  }
                />
                <span>{bar.upsell.priceType === "percentage" ? "%" : "$"}</span>
              </div>
            </div>
          </div>
          <div className="be-field">
            <label>Text</label>
            <input
              value={bar.upsell.text}
              onChange={(e) =>
                onUpdate({
                  upsell: { ...bar.upsell!, text: e.target.value },
                })
              }
            />
          </div>
          <SliderField
            label="Image size"
            value={bar.upsell.imageSize}
            min={20}
            max={60}
            onChange={(v) =>
              onUpdate({ upsell: { ...bar.upsell!, imageSize: v } })
            }
          />
          <p className="be-help">
            Shoppers must check this add-on on the product page. It is never
            pre-selected or added automatically.
          </p>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={bar.upsell.visibleWhenSelected}
              onChange={(e) =>
                onUpdate({
                  upsell: {
                    ...bar.upsell!,
                    visibleWhenSelected: e.target.checked,
                  },
                })
              }
            />
            Visible only when bar is selected
          </label>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={bar.upsell.enableSubscription}
              onChange={(e) =>
                onUpdate({
                  upsell: {
                    ...bar.upsell!,
                    enableSubscription: e.target.checked,
                  },
                })
              }
            />
            Enable subscription
          </label>
        </FeatureCard>
      )}

      {(bar.gifts ?? []).map((gift) => (
        <FeatureCard
          key={gift.id}
          title="Gifts"
          onRemove={() =>
            onUpdate({
              gifts: (bar.gifts ?? []).filter((g) => g.id !== gift.id),
            })
          }
        >
          <div className="be-type-toggle">
            <button
              type="button"
              className={
                "be-type-toggle__btn" +
                (gift.type === "product" ? " be-type-toggle__btn--active" : "")
              }
              onClick={() =>
                onUpdate({
                  gifts: (bar.gifts ?? []).map((g) =>
                    g.id === gift.id
                      ? { ...g, type: "product", text: "+ FREE Gift" }
                      : g,
                  ),
                })
              }
            >
              🎁 Free gift
            </button>
            <button
              type="button"
              className={
                "be-type-toggle__btn" +
                (gift.type === "shipping" ? " be-type-toggle__btn--active" : "")
              }
              onClick={() =>
                onUpdate({
                  gifts: (bar.gifts ?? []).map((g) =>
                    g.id === gift.id
                      ? { ...g, type: "shipping", text: "+ FREE Shipping" }
                      : g,
                  ),
                })
              }
            >
              🚚 Free shipping
            </button>
          </div>
          <div className="be-info-banner">
            We automatically apply a 100% discount to{" "}
            {gift.type === "shipping" ? "shipping" : "gifts"}.
          </div>
          {gift.type === "product" && (
            <button
              type="button"
              className="be-btn-primary"
              onClick={() => pickForGift(gift.id)}
            >
              {gift.productTitle ?? "Select a product"}
            </button>
          )}
          {gift.productTitle && (
            <div className="be-selected-product">
              {gift.imageUrl && <img src={gift.imageUrl} alt="" />}
              <span>{gift.productTitle}</span>
            </div>
          )}
          <div className="be-field">
            <label>Text</label>
            <input
              value={gift.text}
              onChange={(e) =>
                onUpdate({
                  gifts: (bar.gifts ?? []).map((g) =>
                    g.id === gift.id ? { ...g, text: e.target.value } : g,
                  ),
                })
              }
            />
          </div>
          <SliderField
            label="Image size"
            value={gift.imageSize}
            min={20}
            max={60}
            onChange={(v) =>
              onUpdate({
                gifts: (bar.gifts ?? []).map((g) =>
                  g.id === gift.id ? { ...g, imageSize: v } : g,
                ),
              })
            }
          />
          {gift.type === "product" && (
            <>
              <label className="be-checkbox">
                <input
                  type="checkbox"
                  checked={gift.showOriginalPrice}
                  onChange={(e) =>
                    onUpdate({
                      gifts: (bar.gifts ?? []).map((g) =>
                        g.id === gift.id
                          ? { ...g, showOriginalPrice: e.target.checked }
                          : g,
                      ),
                    })
                  }
                />
                Show original price
              </label>
              <label className="be-checkbox">
                <input
                  type="checkbox"
                  checked={gift.includeInCompareAt}
                  onChange={(e) =>
                    onUpdate({
                      gifts: (bar.gifts ?? []).map((g) =>
                        g.id === gift.id
                          ? { ...g, includeInCompareAt: e.target.checked }
                          : g,
                      ),
                    })
                  }
                />
                Include in compare-at price
              </label>
            </>
          )}
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={gift.subscriptionsOnly}
              onChange={(e) =>
                onUpdate({
                  gifts: (bar.gifts ?? []).map((g) =>
                    g.id === gift.id
                      ? { ...g, subscriptionsOnly: e.target.checked }
                      : g,
                  ),
                })
              }
            />
            Apply only for subscriptions
          </label>
        </FeatureCard>
      ))}

      {bar.personalisation && (
        <FeatureCard
          title="Personalisation"
          onRemove={() => onUpdate({ personalisation: null })}
        >
          <div className="be-field">
            <label>Label</label>
            <input
              value={bar.personalisation.label}
              onChange={(e) =>
                onUpdate({
                  personalisation: {
                    ...bar.personalisation!,
                    label: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="be-field">
            <label>Placeholder</label>
            <input
              value={bar.personalisation.placeholder}
              onChange={(e) =>
                onUpdate({
                  personalisation: {
                    ...bar.personalisation!,
                    placeholder: e.target.value,
                  },
                })
              }
            />
          </div>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={bar.personalisation.required}
              onChange={(e) =>
                onUpdate({
                  personalisation: {
                    ...bar.personalisation!,
                    required: e.target.checked,
                  },
                })
              }
            />
            Required field
          </label>
        </FeatureCard>
      )}

      {bar.highlights && (
        <FeatureCard
          title="Highlights"
          onRemove={() => onUpdate({ highlights: null })}
        >
          {bar.highlights.items.map((item, idx) => (
            <div key={item.id} className="be-highlight-row">
              <span className="be-bar-item__drag">⠿</span>
              <input
                value={item.text}
                onChange={(e) => {
                  const items = bar.highlights!.items.map((h, i) =>
                    i === idx ? { ...h, text: e.target.value } : h,
                  );
                  onUpdate({
                    highlights: { ...bar.highlights!, items },
                  });
                }}
              />
              <button
                type="button"
                className="be-link-btn be-link-btn--danger"
                onClick={() => {
                  const items = bar.highlights!.items.filter(
                    (_, i) => i !== idx,
                  );
                  onUpdate({
                    highlights: { ...bar.highlights!, items },
                  });
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="be-btn-primary"
            onClick={() =>
              onUpdate({
                highlights: {
                  ...bar.highlights!,
                  items: [
                    ...bar.highlights!.items,
                    { id: newId("hl"), text: "" },
                  ],
                },
              })
            }
          >
            + Add highlight
          </button>
          <label className="be-checkbox">
            <input
              type="checkbox"
              checked={bar.highlights.showOnlyWhenSelected}
              onChange={(e) =>
                onUpdate({
                  highlights: {
                    ...bar.highlights!,
                    showOnlyWhenSelected: e.target.checked,
                  },
                })
              }
            />
            Show highlights only when selected
          </label>
          <SliderField
            label="Size"
            value={bar.highlights.size}
            min={12}
            max={24}
            onChange={(v) =>
              onUpdate({
                highlights: { ...bar.highlights!, size: v },
              })
            }
          />
        </FeatureCard>
      )}
    </>
  );
}

function FeatureCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="be-feature-card">
      <div className="be-feature-card__header">
        <span className="be-feature-card__title">{title}</span>
        <button type="button" className="be-link-btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="be-feature-card__body">{children}</div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="be-slider-row">
      <label>
        <span>{label}</span>
        <span>{value} px</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
