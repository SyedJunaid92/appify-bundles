import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BAR_VARIABLE_GROUPS } from "../../constants/bar-variables";

type Props = {
  onSelect: (token: string) => void;
  label?: string;
};

export function VariablePicker({ onSelect, label = "Add variable" }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 260;
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    setCoords({ top: rect.bottom + 6, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="be-var-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {"{}"}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="be-var-menu"
            style={{ top: coords.top, left: coords.left }}
            role="menu"
          >
            <div className="be-var-menu__title">
              Add variable
              <span className="be-var-menu__info" title="Inserts a live value into this text">
                i
              </span>
            </div>
            {BAR_VARIABLE_GROUPS.map((group, index) => (
              <div key={group.id} className="be-var-group">
                {index > 0 && <div className="be-var-group__rule" />}
                <div className="be-var-group__label">{group.label}</div>
                {group.items.map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    role="menuitem"
                    className="be-var-group__item"
                    onClick={() => {
                      onSelect(item.token);
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export function VariableField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="be-field">
      <label className="be-var-field-label">
        <span>{label}</span>
        <VariablePicker onSelect={(token) => onChange(`${value}${token}`)} />
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error && <span className="be-field-error">{error}</span>}
    </div>
  );
}
