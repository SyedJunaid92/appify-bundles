import type { ReactNode } from "react";
import type { BundleEditorState, FontWeightStyle } from "../../types/bundle-editor";
import { Accordion } from "./Accordion";
import { ColorPickerField } from "./ColorPickerField";

const LAYOUTS = [
  { id: "vertical" as const, label: "Stacked" },
  { id: "horizontal" as const, label: "Columns" },
  { id: "compact" as const, label: "Grid" },
  { id: "minimal" as const, label: "List" },
];

const WEIGHTS: FontWeightStyle[] = ["regular", "medium", "bold"];

type Style = BundleEditorState["style"];

export function StylePanel({
  style,
  onChange,
}: {
  style: Style;
  onChange: (patch: Partial<Style>) => void;
}) {
  return (
    <div>
      <Accordion title="Style" defaultOpen>
        <div className="be-layout-presets">
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className={
                "be-layout-preset" +
                (style.layout === layout.id ? " is-selected" : "")
              }
              aria-label={layout.label}
              onClick={() => onChange({ layout: layout.id })}
            >
              <LayoutIcon id={layout.id} />
            </button>
          ))}
        </div>
        <div className="be-style-slider">
          <label>
            <span>Corner radius</span>
            <span className="be-style-slider__value">
              {style.cornerRadius} px
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={24}
            value={style.cornerRadius}
            onChange={(e) => onChange({ cornerRadius: Number(e.target.value) })}
          />
        </div>
        <div className="be-style-slider">
          <label>
            <span>Spacing</span>
            <span className="be-style-slider__value">{style.spacing} px</span>
          </label>
          <input
            type="range"
            min={0}
            max={24}
            value={style.spacing}
            onChange={(e) => onChange({ spacing: Number(e.target.value) })}
          />
        </div>
      </Accordion>

      <Accordion title="Colors" defaultOpen>
        <ColorGroup title="General">
          <ColorPickerField
            label="Cards bg"
            value={style.cardsBg}
            onChange={(cardsBg) => onChange({ cardsBg })}
          />
          <ColorPickerField
            label="Selected bg"
            value={style.selectedBg}
            onChange={(selectedBg) => onChange({ selectedBg })}
          />
          <ColorPickerField
            label="Border color"
            value={style.borderColor}
            onChange={(borderColor) => onChange({ borderColor })}
          />
          <ColorPickerField
            label="Block title"
            value={style.blockTitleColor}
            onChange={(blockTitleColor) => onChange({ blockTitleColor })}
          />
        </ColorGroup>
        <ColorGroup title="Bar texts">
          <ColorPickerField
            label="Title"
            value={style.titleColor}
            onChange={(titleColor) => onChange({ titleColor })}
          />
          <ColorPickerField
            label="Subtitle"
            value={style.subtitleColor}
            onChange={(subtitleColor) => onChange({ subtitleColor })}
          />
          <ColorPickerField
            label="Price"
            value={style.priceColor}
            onChange={(priceColor) => onChange({ priceColor })}
          />
          <ColorPickerField
            label="Full price"
            value={style.fullPriceColor}
            onChange={(fullPriceColor) => onChange({ fullPriceColor })}
          />
        </ColorGroup>
        <ColorGroup title="Label">
          <ColorPickerField
            label="Background"
            value={style.labelBg}
            onChange={(labelBg) => onChange({ labelBg })}
          />
          <ColorPickerField
            label="Text"
            value={style.labelText}
            onChange={(labelText) => onChange({ labelText })}
          />
        </ColorGroup>
        <ColorGroup title="Free gift">
          <ColorPickerField
            label="Background"
            value={style.giftBg}
            onChange={(giftBg) => onChange({ giftBg })}
          />
          <ColorPickerField
            label="Text"
            value={style.giftText}
            onChange={(giftText) => onChange({ giftText })}
          />
          <ColorPickerField
            label="Selected bg"
            value={style.giftSelectedBg}
            onChange={(giftSelectedBg) => onChange({ giftSelectedBg })}
          />
          <ColorPickerField
            label="Selected text"
            value={style.giftSelectedText}
            onChange={(giftSelectedText) => onChange({ giftSelectedText })}
          />
        </ColorGroup>
        <ColorGroup title="Upsell">
          <ColorPickerField
            label="Background"
            value={style.upsellBg}
            onChange={(upsellBg) => onChange({ upsellBg })}
          />
          <ColorPickerField
            label="Text"
            value={style.upsellText}
            onChange={(upsellText) => onChange({ upsellText })}
          />
          <ColorPickerField
            label="Selected bg"
            value={style.upsellSelectedBg}
            onChange={(upsellSelectedBg) => onChange({ upsellSelectedBg })}
          />
          <ColorPickerField
            label="Selected text"
            value={style.upsellSelectedText}
            onChange={(upsellSelectedText) => onChange({ upsellSelectedText })}
          />
        </ColorGroup>
      </Accordion>

      <Accordion title="Typography" defaultOpen>
        <TypeRow
          label="Block title"
          size={style.blockTitleSize}
          weight={style.blockTitleWeight}
          onSize={(blockTitleSize) => onChange({ blockTitleSize })}
          onWeight={(blockTitleWeight) => onChange({ blockTitleWeight })}
        />
        <TypeRow
          label="Title"
          size={style.titleSize}
          weight={style.titleWeight}
          onSize={(titleSize) => onChange({ titleSize })}
          onWeight={(titleWeight) => onChange({ titleWeight })}
        />
        <TypeRow
          label="Subtitle"
          size={style.subtitleSize}
          weight={style.subtitleWeight}
          onSize={(subtitleSize) => onChange({ subtitleSize })}
          onWeight={(subtitleWeight) => onChange({ subtitleWeight })}
        />
        <TypeRow
          label="Label"
          size={style.labelSize}
          weight={style.labelWeight}
          onSize={(labelSize) => onChange({ labelSize })}
          onWeight={(labelWeight) => onChange({ labelWeight })}
        />
        <TypeRow
          label="Free gift"
          size={style.giftSize}
          weight={style.giftWeight}
          onSize={(giftSize) => onChange({ giftSize })}
          onWeight={(giftWeight) => onChange({ giftWeight })}
        />
        <TypeRow
          label="Upsell"
          size={style.upsellSize}
          weight={style.upsellWeight}
          onSize={(upsellSize) => onChange({ upsellSize })}
          onWeight={(upsellWeight) => onChange({ upsellWeight })}
        />
        <TypeRow
          label="Unit label"
          size={style.unitLabelSize}
          weight={style.unitLabelWeight}
          onSize={(unitLabelSize) => onChange({ unitLabelSize })}
          onWeight={(unitLabelWeight) => onChange({ unitLabelWeight })}
        />
      </Accordion>

      <div className="be-custom-styles">
        <div className="be-custom-styles__header">
          <strong>Custom Styles</strong>
          <label className="be-switch">
            <input
              type="checkbox"
              checked={style.customCssEnabled}
              onChange={(e) => onChange({ customCssEnabled: e.target.checked })}
            />
            <span />
          </label>
        </div>
        {style.customCssEnabled && (
          <>
            <div className="be-css-scope">
              <button
                type="button"
                className={style.customCssScope === "all" ? "is-active" : ""}
                onClick={() => onChange({ customCssScope: "all" })}
              >
                All deals
              </button>
              <button
                type="button"
                className={style.customCssScope === "this" ? "is-active" : ""}
                onClick={() => onChange({ customCssScope: "this" })}
              >
                This deal
              </button>
            </div>
            <div className="be-css-editor">
              <div className="be-css-editor__gutter">
                {(style.customCss || " ").split("\n").map((_, index) => (
                  <span key={index}>{index + 1}</span>
                ))}
              </div>
              <textarea
                value={style.customCss}
                onChange={(e) => onChange({ customCss: e.target.value })}
                placeholder="/* Custom CSS */"
                spellCheck={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ColorGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="be-color-group">
      <p className="be-color-group__title">{title}</p>
      <div className="be-color-group__grid">{children}</div>
    </div>
  );
}

function TypeRow({
  label,
  size,
  weight,
  onSize,
  onWeight,
}: {
  label: string;
  size: number;
  weight: FontWeightStyle;
  onSize: (size: number) => void;
  onWeight: (weight: FontWeightStyle) => void;
}) {
  return (
    <div className="be-type-row">
      <p className="be-type-row__label">{label}</p>
      <div className="be-type-row__fields">
        <label className="be-type-size">
          <span>Font size</span>
          <span className="be-input-suffix">
            <input
              type="number"
              min={10}
              max={40}
              value={size}
              onChange={(e) => onSize(Number(e.target.value))}
            />
            <span>px</span>
          </span>
        </label>
        <label>
          <span>Font style</span>
          <select
            value={weight}
            onChange={(e) => onWeight(e.target.value as FontWeightStyle)}
          >
            {WEIGHTS.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function LayoutIcon({ id }: { id: Style["layout"] }) {
  if (id === "horizontal") {
    return (
      <span className="be-layout-icon be-layout-icon--cols">
        <i />
        <i />
        <i />
      </span>
    );
  }
  if (id === "compact") {
    return (
      <span className="be-layout-icon be-layout-icon--grid">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }
  if (id === "minimal") {
    return (
      <span className="be-layout-icon be-layout-icon--list">
        <i />
        <i />
        <i />
      </span>
    );
  }
  return (
    <span className="be-layout-icon be-layout-icon--stack">
      <i />
      <i />
      <i />
    </span>
  );
}
