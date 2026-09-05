import { useState } from "react";
import type { ReactNode } from "react";

export function Accordion({
  title,
  defaultOpen = false,
  children,
  trailing,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="be-accordion">
      <button
        type="button"
        className="be-accordion__header"
        onClick={() => setOpen(!open)}
      >
        <span>{open ? "▾" : "▸"} {title}</span>
        {trailing}
      </button>
      {open && <div className="be-accordion__body">{children}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="be-toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}
