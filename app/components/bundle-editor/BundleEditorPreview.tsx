import type { CSSProperties } from "react";
import type {
  BundleBar,
  BundleEditorState,
  DealBadge,
  PreviewProduct,
} from "../../types/bundle-editor";
import {
  applyBarPrice,
  calculateBarPricing,
  formatMoney,
  interpolateBarText,
  resolveProductPrices,
} from "../../utils/bundle-editor";
import type { BarProduct } from "../../types/bundle-editor";
import { OverlayBadge } from "./OverlayBadge";

function fontWeight(value?: string) {
  if (value === "bold") return "700";
  if (value === "medium") return "500";
  return "400";
}

type Props = {
  state: BundleEditorState;
  product: PreviewProduct;
  selectedBarId: string;
  onSelectBar: (id: string) => void;
};

export function BundleEditorPreview({
  state,
  product,
  selectedBarId,
  onSelectBar,
}: Props) {
  const { style, settings, blockTitle, features } = state;
  const currency = product.currencyCode || "CAD";
  const decimals = !settings.showPriceWithoutDecimals;

  const defaultSelected =
    state.bars.find((b) => b.selectedByDefault)?.id ??
    state.bars[0]?.id ??
    "";
  const activeId = selectedBarId || defaultSelected;
  const layout = style.layout || "vertical";

  const cssVars = {
    "--be-radius": `${style.cornerRadius}px`,
    "--be-spacing": `${style.spacing}px`,
    "--be-cards-bg": style.cardsBg,
    "--be-selected-bg": style.selectedBg,
    "--be-inactive-text": style.inactiveText || style.titleColor,
    "--be-button-bg": style.buttonBg || "#1a1a1a",
    "--be-button-text": style.buttonText || "#ffffff",
    "--be-border": style.borderColor,
    "--be-block-title": style.blockTitleColor,
    "--be-title": style.titleColor,
    "--be-subtitle": style.subtitleColor,
    "--be-price": style.priceColor,
    "--be-full-price": style.fullPriceColor,
    "--be-badge-bg": style.badgeBg,
    "--be-badge-text": style.badgeText,
    "--be-block-title-size": `${style.blockTitleSize}px`,
    "--be-title-size": `${style.titleSize}px`,
    "--be-subtitle-size": `${style.subtitleSize}px`,
    "--be-title-weight": fontWeight(style.titleWeight),
    "--be-subtitle-weight": fontWeight(style.subtitleWeight),
    "--be-gift-bg": style.giftBg,
    "--be-gift-text": style.giftText,
    "--be-upsell-bg": style.upsellBg,
    "--be-upsell-text": style.upsellText,
  } as CSSProperties;

  return (
    <div
      className={`be-widget-preview be-widget-preview--${layout}`}
      style={cssVars}
    >
      <div
        className="be-widget-preview__title"
        style={{ fontSize: style.blockTitleSize }}
      >
        {blockTitle}
      </div>

      <div className="be-widget-preview__options">
        {state.bars.map((bar) => (
          <PreviewBar
            key={bar.id}
            bar={bar}
            product={product}
            settings={settings}
            badges={state.badgesEnabled === false ? [] : state.badges ?? []}
            currency={currency}
            decimals={decimals}
            selected={bar.id === activeId}
            onSelect={() => onSelectBar(bar.id)}
          />
        ))}
      </div>

      <button type="button" className="be-widget-preview__button">
        Add to cart
      </button>

      {features.countdownTimer.enabled && (
        <div
          className="be-widget-preview__countdown"
          style={{
            background: features.countdownTimer.backgroundColor,
            color: features.countdownTimer.textColor,
            textAlign: features.countdownTimer.alignment,
            fontSize: features.countdownTimer.fontSize,
            fontWeight: features.countdownTimer.bold ? 700 : 400,
            fontStyle: features.countdownTimer.italic ? "italic" : "normal",
          }}
        >
          {features.countdownTimer.title.replace("{{timer}}", "14:59")}
        </div>
      )}

      {style.customCssEnabled && style.customCss && (
        <style>{style.customCss}</style>
      )}
    </div>
  );
}

function PreviewBar({
  bar,
  product,
  settings,
  badges,
  currency,
  decimals,
  selected,
  onSelect,
}: {
  bar: BundleBar;
  product: PreviewProduct;
  settings: BundleEditorState["settings"];
  badges: DealBadge[];
  currency: string;
  decimals: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const pricing = calculateBarPricing(bar, product, settings);
  const displayPrice = settings.showPricePerItem
    ? pricing.perItem
    : pricing.saleTotal;
  const quantity =
    bar.kind === "bogo" ? (bar.buyQty || 1) + (bar.getQty || 1) : bar.quantity || 1;
  const extras = {
    buyQty: bar.buyQty,
    getQty: bar.getQty,
    giftCount: (bar.gifts ?? []).length,
    sellingPlanName: bar.applySellingPlan ? "Subscribe & save" : "",
    sellingPlanDiscount: bar.applySellingPlan ? "10%" : "",
  };
  const title = interpolateBarText(
    bar.title,
    product,
    pricing,
    currency,
    decimals,
    quantity,
    extras,
  );
  const subtitle = interpolateBarText(
    bar.subtitle,
    product,
    pricing,
    currency,
    decimals,
    quantity,
    extras,
  );
  const label = interpolateBarText(
    bar.label,
    product,
    pricing,
    currency,
    decimals,
    quantity,
    extras,
  );
  const badge =
    bar.badgeText ||
    label ||
    (pricing.savings > 0 && bar.kind !== "complete"
      ? `SAVE ${formatMoney(pricing.savings, currency, decimals)}`
      : "");
  const featuredImage =
    bar.image?.url === "{{featured_image}}" ? product.imageUrl : bar.image?.url;
  const overlays = badges.filter((item) => item.barId === bar.id);
  const borderBadge = overlays.find((item) => item.style === "border");

  const showExtras =
    selected ||
    !(bar.upsell?.visibleWhenSelected || bar.highlights?.showOnlyWhenSelected);

  return (
    <div
      className={
        "be-widget-preview__option-wrap" +
        (borderBadge ? " be-widget-preview__option-wrap--border" : "")
      }
      style={
        borderBadge
          ? ({
              "--be-badge-thickness": `${borderBadge.thickness}px`,
              "--be-badge-distance": `${borderBadge.distance}px`,
            } as CSSProperties)
          : undefined
      }
    >
      {overlays.map((item) => (
        <OverlayBadge
          key={item.id}
          badge={item}
          text={interpolateBarText(
            item.text,
            product,
            pricing,
            currency,
            decimals,
            quantity,
            extras,
          )}
        />
      ))}
    <button
      type="button"
      className={
        "be-widget-preview__option" +
        (selected ? " be-widget-preview__option--selected" : "")
      }
      onClick={onSelect}
      disabled={bar.soldOut}
      style={{ opacity: bar.soldOut ? 0.5 : 1 }}
    >
      {featuredImage && (
        <img
          src={featuredImage}
          alt=""
          className="be-widget-preview__bar-image"
          style={{ width: bar.image?.size, height: bar.image?.size }}
        />
      )}
      <span className="be-widget-preview__radio" />
      <span className="be-widget-preview__content">
        <div className="be-widget-preview__row">
          <span className="be-widget-preview__name">{title}</span>
          <span className="be-widget-preview__prices">
            <span className="be-widget-preview__price">
              {formatMoney(displayPrice, currency, decimals)}
            </span>
            {pricing.savings > 0 && (
              <span className="be-widget-preview__compare">
                {formatMoney(pricing.compareTotal, currency, decimals)}
              </span>
            )}
          </span>
        </div>
        {subtitle && <div className="be-widget-preview__sub">{subtitle}</div>}
        {bar.kind === "complete" && (
          <CompleteBundleCards
            bar={bar}
            product={product}
            settings={settings}
            currency={currency}
            decimals={decimals}
          />
        )}
        {badge && (
          <span className="be-widget-preview__badge">
            {badge}
          </span>
        )}
        {showExtras && bar.upsell && (
          <label className="be-widget-preview__upsell">
            <input type="checkbox" disabled checked={false} readOnly />
            {bar.upsell.imageUrl ? (
              <img src={bar.upsell.imageUrl} alt="" />
            ) : (
              <span className="be-widget-preview__placeholder" />
            )}
            <span>{bar.upsell.text || bar.upsell.productTitle}</span>
          </label>
        )}
        {showExtras &&
          (bar.gifts ?? []).map((gift) => (
            <div key={gift.id} className="be-widget-preview__gift">
              {gift.imageUrl ? (
                <img src={gift.imageUrl} alt="" />
              ) : (
                <span className="be-widget-preview__placeholder" />
              )}
              <span>{gift.text || gift.productTitle || "Free gift"}</span>
            </div>
          ))}
        {showExtras && bar.highlights?.items?.length ? (
          <ul className="be-widget-preview__highlights">
            {bar.highlights.items.map((item) => (
              <li key={item.id}>
                <span>✓</span>
                {item.text}
              </li>
            ))}
          </ul>
        ) : null}
        {showExtras && bar.personalisation && (
          <div className="be-widget-preview__personalisation">
            <label>{bar.personalisation.label || "Personalisation"}</label>
            <input
              type="text"
              placeholder={bar.personalisation.placeholder || ""}
              readOnly
            />
          </div>
        )}
      </span>
    </button>
    </div>
  );
}

function CompleteBundleCards({
  bar,
  product,
  settings,
  currency,
  decimals,
}: {
  bar: BundleBar;
  product: PreviewProduct;
  settings: BundleEditorState["settings"];
  currency: string;
  decimals: boolean;
}) {
  const { sale: unitSale, compare: unitCompare } = resolveProductPrices(
    product,
    settings.useCompareAtPrice,
  );
  const mainConfig = (bar.products ?? []).find((item) => item.isDefault);
  const complements = (bar.products ?? []).filter((item) => !item.isDefault);
  const cards = [
    {
      id: "main",
      title: product.title,
      imageUrl: product.imageUrl,
      compare: unitCompare,
      sale: applyBarPrice(
        unitSale,
        mainConfig?.priceType || bar.priceType,
        mainConfig?.discountValue ?? bar.discountValue,
      ),
      hidePrice: Boolean(mainConfig?.hidePrice),
    },
    ...complements.map((item) =>
      completeCardFromProduct(item, unitSale, unitCompare, bar, settings),
    ),
  ];

  if (cards.length === 1) {
    cards.push({
      id: "recommended",
      title: "Recommended product",
      imageUrl: undefined,
      compare: unitCompare * 0.25,
      sale: applyBarPrice(unitSale * 0.25, bar.priceType, bar.discountValue),
      hidePrice: false,
    });
  }

  return (
    <div
      className={
        "be-complete-cards" +
        (bar.completeLayout === "stack" ? " be-complete-cards--stack" : "")
      }
    >
      {cards.map((card, index) => (
        <div key={card.id} className="be-complete-cards__item-wrap">
          {index > 0 && <span className="be-complete-cards__plus">+</span>}
          <div className="be-complete-cards__item">
            {card.imageUrl ? (
              <img src={card.imageUrl} alt="" />
            ) : (
              <span className="be-complete-cards__ph" />
            )}
            <span className="be-complete-cards__title">{card.title}</span>
            {!card.hidePrice && (
              <span className="be-complete-cards__price">
                <strong>{formatMoney(card.sale, currency, decimals)}</strong>
                {card.sale < card.compare && (
                  <s>{formatMoney(card.compare, currency, decimals)}</s>
                )}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function completeCardFromProduct(
  item: BarProduct,
  fallbackSale: number,
  fallbackCompare: number,
  bar: BundleBar,
  settings: BundleEditorState["settings"],
) {
  const sale = (item.price || fallbackSale * 0.25) * (item.quantity || 1);
  const compare =
    (settings.useCompareAtPrice && item.compareAtPrice
      ? item.compareAtPrice
      : item.price || fallbackCompare * 0.25) * (item.quantity || 1);
  return {
    id: item.id,
    title: item.title || "Product",
    imageUrl: item.imageUrl,
    compare,
    sale: applyBarPrice(
      sale,
      item.priceType || bar.priceType,
      item.discountValue ?? bar.discountValue,
    ),
    hidePrice: item.hidePrice,
  };
}
