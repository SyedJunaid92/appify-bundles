import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const BRAND_COLORS = [
  "#202223",
  "#6d7175",
  "#8c9196",
  "#e3e3e3",
  "#f6f6f7",
  "#ffffff",
  "#008060",
  "#005bd3",
  "#d82c0d",
  "#ffc453",
];

const OTHER_COLORS = [
  "#000000",
  "#ffffff",
  "#202223",
  "#6d7175",
  "#8c9196",
  "#c9cccf",
  "#f6f6f7",
];

type Hsv = { h: number; s: number; v: number; a: number };

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function hexToHsv(input: string): Hsv {
  const { r, g, b, a } = parseColor(input);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max, a };
}

function hsvToRgba({ h, s, v, a }: Hsv) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a,
  };
}

function toCss(hsv: Hsv) {
  const { r, g, b, a } = hsvToRgba(hsv);
  if (a >= 0.995) {
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
}

function parseColor(value: string) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return {
      r: parseInt(hex[1].slice(0, 2), 16) / 255,
      g: parseInt(hex[1].slice(2, 4), 16) / 255,
      b: parseInt(hex[1].slice(4, 6), 16) / 255,
      a: 1,
    };
  }
  const rgba = value.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i,
  );
  if (rgba) {
    return {
      r: Number(rgba[1]) / 255,
      g: Number(rgba[2]) / 255,
      b: Number(rgba[3]) / 255,
      a: rgba[4] == null ? 1 : Number(rgba[4]),
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function previewColor(value: string) {
  return /^#|^rgb/.test(value) ? value : "#000000";
}

export function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="be-color-field">
      <span className="be-color-field__label">{label}</span>
      <button
        type="button"
        ref={triggerRef}
        className={"be-color-field__trigger" + (open ? " is-open" : "")}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className="be-color-field__circle"
          style={{ background: previewColor(value) }}
        />
        <span className="be-color-field__chevron">⇅</span>
      </button>
      {open && (
        <ColorPopover
          anchor={triggerRef.current}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ColorPopover({
  anchor,
  value,
  onChange,
  onClose,
}: {
  anchor: HTMLElement | null;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"brand" | "custom">("custom");
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = 280;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top =
      rect.bottom + 220 > window.innerHeight
        ? Math.max(8, rect.top - 320)
        : rect.bottom + 8;
    setPos({ top, left });
  }, [anchor]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (popRef.current?.contains(event.target as Node)) return;
      if (anchor?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [anchor, onClose]);

  const commit = (next: Hsv) => {
    setHsv(next);
    onChange(toCss(next));
  };

  const rgb = hsvToRgba(hsv);
  const hex = `#${[rgb.r, rgb.g, rgb.b]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;

  if (!anchor) return null;

  return createPortal(
    <div
      ref={popRef}
      className="be-color-pop"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="be-color-pop__tabs">
        <button
          type="button"
          className={tab === "brand" ? "is-active" : ""}
          onClick={() => setTab("brand")}
        >
          Brand colors
        </button>
        <button
          type="button"
          className={tab === "custom" ? "is-active" : ""}
          onClick={() => setTab("custom")}
        >
          Custom colors
        </button>
      </div>

      {tab === "brand" ? (
        <div className="be-color-pop__swatches">
          {BRAND_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={
                "be-color-pop__swatch" + (value === color ? " is-selected" : "")
              }
              style={{ background: color }}
              onClick={() => {
                onChange(color);
                setHsv(hexToHsv(color));
              }}
              aria-label={color}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="be-color-pop__custom">
            <div
              className="be-color-pop__sv"
              style={{ background: hueColor }}
              onPointerDown={(event) => {
                const node = event.currentTarget;
                const move = (clientX: number, clientY: number) => {
                  const box = node.getBoundingClientRect();
                  commit({
                    ...hsv,
                    s: clamp((clientX - box.left) / box.width),
                    v: clamp(1 - (clientY - box.top) / box.height),
                  });
                };
                move(event.clientX, event.clientY);
                const onMove = (next: PointerEvent) => move(next.clientX, next.clientY);
                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            >
              <span
                className="be-color-pop__thumb"
                style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
              />
            </div>
            <input
              type="range"
              className="be-color-pop__hue"
              min={0}
              max={360}
              value={hsv.h}
              onChange={(e) => commit({ ...hsv, h: Number(e.target.value) })}
              aria-label="Hue"
            />
            <input
              type="range"
              className="be-color-pop__alpha"
              min={0}
              max={100}
              value={Math.round(hsv.a * 100)}
              onChange={(e) => commit({ ...hsv, a: Number(e.target.value) / 100 })}
              aria-label="Opacity"
            />
          </div>
          <div className="be-color-pop__inputs">
            <label>
              <span
                className="be-color-pop__hex-swatch"
                style={{ background: previewColor(value) }}
              />
              <input
                value={hex.toUpperCase()}
                onChange={(e) => {
                  const next = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(next)) {
                    commit({ ...hexToHsv(next), a: hsv.a });
                  }
                }}
              />
            </label>
            <label className="be-color-pop__opacity">
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(hsv.a * 100)}
                onChange={(e) =>
                  commit({ ...hsv, a: clamp(Number(e.target.value) / 100) })
                }
              />
              <span>%</span>
            </label>
          </div>
          <p className="be-color-pop__other-label">Other colors</p>
          <div className="be-color-pop__swatches">
            {OTHER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={
                  "be-color-pop__swatch" + (hex === color ? " is-selected" : "")
                }
                style={{ background: color }}
                onClick={() => commit({ ...hexToHsv(color), a: 1 })}
                aria-label={color}
              />
            ))}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
