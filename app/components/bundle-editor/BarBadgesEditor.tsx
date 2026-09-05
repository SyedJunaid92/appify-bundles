import { useRef } from "react";
import type {
  BundleEditorState,
  DealBadge,
  OverlayBadgeStyle,
} from "../../types/bundle-editor";
import { createDealBadge } from "../../constants/bundle-editor-defaults";
import { ColorPickerField } from "./ColorPickerField";
import { VariableField } from "./VariablePicker";

const STYLES: Array<{ id: OverlayBadgeStyle; label: string }> = [
  { id: "simple", label: "Simple" },
  { id: "popular", label: "Most popular" },
  { id: "border", label: "Border" },
  { id: "custom", label: "Custom" },
];

type Props = {
  state: BundleEditorState;
  onChange: (state: BundleEditorState) => void;
};

export function BarBadgesEditor({ state, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingId = useRef<string | null>(null);

  const update = (patch: Partial<BundleEditorState>) =>
    onChange({ ...state, ...patch });

  const updateBadge = (id: string, patch: Partial<DealBadge>) =>
    update({
      badges: (state.badges ?? []).map((badge) =>
        badge.id === id ? { ...badge, ...patch } : badge,
      ),
    });

  const addBadge = () => {
    const barId = state.bars[0]?.id || "";
    update({
      badgesEnabled: true,
      badges: [...(state.badges ?? []), createDealBadge({ barId })],
    });
  };

  const removeBadge = (id: string) =>
    update({ badges: (state.badges ?? []).filter((badge) => badge.id !== id) });

  const pickImage = (id: string) => {
    pendingId.current = id;
    fileRef.current?.click();
  };

  return (
    <div className="be-bar-tab">
      <div className="be-bar-tab__head">
        <div>
          <strong>Badges</strong>
          <p>Attach one style per badge. Switching style replaces the previous look.</p>
        </div>
        <label className="be-switch" aria-label="Toggle badges">
          <input
            type="checkbox"
            checked={state.badgesEnabled}
            onChange={(e) => update({ badgesEnabled: e.target.checked })}
          />
          <span />
        </label>
      </div>

      {state.badgesEnabled &&
        (state.badges ?? []).map((badge) => (
          <article key={badge.id} className="be-badge-card">
            <header>
              <strong>Badge</strong>
              <button type="button" onClick={() => removeBadge(badge.id)}>
                Remove
              </button>
            </header>

            <div className="be-field">
              <label htmlFor={`badge-style-${badge.id}`}>Style</label>
              <select
                id={`badge-style-${badge.id}`}
                value={badge.style}
                onChange={(e) =>
                  updateBadge(badge.id, {
                    style: e.target.value as OverlayBadgeStyle,
                  })
                }
              >
                {STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="be-field">
              <label htmlFor={`badge-bar-${badge.id}`}>Attached to</label>
              <select
                id={`badge-bar-${badge.id}`}
                value={badge.barId}
                onChange={(e) => updateBadge(badge.id, { barId: e.target.value })}
              >
                {state.bars.map((bar, index) => (
                  <option key={bar.id} value={bar.id}>
                    Bar #{index + 1} — {bar.title || "Untitled"}
                  </option>
                ))}
              </select>
            </div>

            {badge.style === "simple" && (
              <>
                <VariableField
                  label="Text"
                  value={badge.text}
                  onChange={(text) => updateBadge(badge.id, { text })}
                />
                <SliderField
                  label="Text size"
                  value={badge.textSize}
                  min={8}
                  max={22}
                  onChange={(textSize) => updateBadge(badge.id, { textSize })}
                />
              </>
            )}

            {badge.style === "popular" && (
              <SliderField
                label="Size"
                value={badge.size}
                min={64}
                max={160}
                onChange={(size) => updateBadge(badge.id, { size })}
              />
            )}

            {badge.style === "border" && (
              <>
                <VariableField
                  label="Text"
                  value={badge.text}
                  onChange={(text) => updateBadge(badge.id, { text })}
                />
                <div className="be-field">
                  <span className="be-field-label">Position</span>
                  <div className="be-segmented">
                    {(["all", "top", "bottom", "left", "right"] as const).map(
                      (position) => (
                        <button
                          key={position}
                          type="button"
                          className={badge.position === position ? "active" : ""}
                          onClick={() => updateBadge(badge.id, { position })}
                        >
                          {position[0].toUpperCase() + position.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <SliderField
                  label="Thickness"
                  value={badge.thickness}
                  min={8}
                  max={28}
                  onChange={(thickness) => updateBadge(badge.id, { thickness })}
                />
                <SliderField
                  label="Distance from bar"
                  value={badge.distance}
                  min={0}
                  max={24}
                  onChange={(distance) => updateBadge(badge.id, { distance })}
                />
                <SliderField
                  label="Text size"
                  value={badge.textSize}
                  min={8}
                  max={18}
                  onChange={(textSize) => updateBadge(badge.id, { textSize })}
                />
                <SliderField
                  label="Text spacing"
                  value={badge.textSpacing}
                  min={0}
                  max={12}
                  onChange={(textSpacing) => updateBadge(badge.id, { textSpacing })}
                />
                <label className="be-checkbox">
                  <input
                    type="checkbox"
                    checked={badge.repeatText}
                    onChange={(e) =>
                      updateBadge(badge.id, { repeatText: e.target.checked })
                    }
                  />
                  Repeat text
                </label>
                <label className="be-checkbox">
                  <input
                    type="checkbox"
                    checked={badge.delimiterEnabled}
                    onChange={(e) =>
                      updateBadge(badge.id, { delimiterEnabled: e.target.checked })
                    }
                  />
                  Delimiter between repetitions
                </label>
                {badge.delimiterEnabled && (
                  <div className="be-field">
                    <label htmlFor={`badge-del-${badge.id}`}>Delimiter</label>
                    <input
                      id={`badge-del-${badge.id}`}
                      value={badge.delimiter}
                      onChange={(e) =>
                        updateBadge(badge.id, { delimiter: e.target.value })
                      }
                    />
                  </div>
                )}
                <label className="be-checkbox">
                  <input
                    type="checkbox"
                    checked={badge.animate}
                    onChange={(e) =>
                      updateBadge(badge.id, { animate: e.target.checked })
                    }
                  />
                  Animate
                </label>
                {badge.animate && (
                  <>
                    <SliderField
                      label="Speed"
                      value={badge.speed}
                      min={8}
                      max={80}
                      suffix=""
                      onChange={(speed) => updateBadge(badge.id, { speed })}
                    />
                    <div className="be-field">
                      <label htmlFor={`badge-dir-${badge.id}`}>Direction</label>
                      <select
                        id={`badge-dir-${badge.id}`}
                        value={badge.direction}
                        onChange={(e) =>
                          updateBadge(badge.id, {
                            direction: e.target.value as DealBadge["direction"],
                          })
                        }
                      >
                        <option value="clockwise">Clockwise</option>
                        <option value="counterclockwise">Counterclockwise</option>
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {badge.style === "custom" && (
              <>
                <SliderField
                  label="Size"
                  value={badge.size}
                  min={40}
                  max={180}
                  onChange={(size) => updateBadge(badge.id, { size })}
                />
                <div className="be-badge-note">
                  Recommended size: 306×168 (Horizontal badges work best).
                </div>
                <div className="be-badge-image-row">
                  <button type="button" onClick={() => pickImage(badge.id)}>
                    {badge.imageUrl ? "Replace image" : "Edit image"}
                  </button>
                  <span className="be-overlay-badge__ph">
                    {badge.imageUrl ? (
                      <img src={badge.imageUrl} alt="" />
                    ) : (
                      "IMG"
                    )}
                  </span>
                </div>
              </>
            )}

            {badge.style !== "custom" && (
              <div className="be-color-row">
                <ColorPickerField
                  label="Text color"
                  value={badge.textColor}
                  onChange={(textColor) => updateBadge(badge.id, { textColor })}
                />
                <ColorPickerField
                  label="Background color"
                  value={badge.backgroundColor}
                  onChange={(backgroundColor) =>
                    updateBadge(badge.id, { backgroundColor })
                  }
                />
              </div>
            )}
          </article>
        ))}

      {state.badgesEnabled && (
        <button type="button" className="be-add-badge" onClick={addBadge}>
          + Add badge
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          const id = pendingId.current;
          event.target.value = "";
          if (!file || !id) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              updateBadge(id, { imageUrl: reader.result });
            }
          };
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  suffix = " px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="be-slider-row">
      <label>
        <span>{label}</span>
        <span>
          {value}
          {suffix}
        </span>
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
