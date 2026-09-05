import { Form, useNavigate } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  bundleId: string;
  status: string;
  isSubmitting?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
};

const MENU_WIDTH = 168;

export function BundleActionsMenu({
  bundleId,
  status,
  isSubmitting,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dropdownHeight = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setPosition({
      top: openUpward ? rect.top - dropdownHeight - 6 : rect.bottom + 6,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const onReposition = () => updatePosition();

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  const toggleMenu = () => {
    if (!open) updatePosition();
    setOpen((value) => !value);
  };

  const editBundle = () => {
    setOpen(false);
    navigate(`/app/bundles/${bundleId}/edit`);
  };

  const dropdown =
    open &&
    createPortal(
      <div
        ref={menuRef}
        className="bundle-actions-menu__dropdown bundle-actions-menu__dropdown--portal"
        role="menu"
        style={{
          top: position.top,
          left: position.left,
          width: MENU_WIDTH,
        }}
      >
        <button
          type="button"
          className="bundle-actions-menu__item"
          role="menuitem"
          onMouseDown={(event) => event.preventDefault()}
          onClick={editBundle}
        >
          Edit
        </button>

        {status === "draft" && (
          <Form method="post" className="bundle-actions-menu__form">
            <input type="hidden" name="intent" value="publish" />
            <input type="hidden" name="id" value={bundleId} />
            <button
              type="submit"
              className="bundle-actions-menu__item"
              role="menuitem"
              disabled={isSubmitting}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setOpen(false)}
            >
              Publish
            </button>
          </Form>
        )}

        {status === "active" && (
          <Form method="post" className="bundle-actions-menu__form">
            <input type="hidden" name="intent" value="ab_test" />
            <input type="hidden" name="id" value={bundleId} />
            <button
              type="submit"
              className="bundle-actions-menu__item"
              role="menuitem"
              disabled={isSubmitting}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setOpen(false)}
            >
              Create A/B test
            </button>
          </Form>
        )}

        {status === "active" && (
          <Form method="post" className="bundle-actions-menu__form">
            <input type="hidden" name="intent" value="pause" />
            <input type="hidden" name="id" value={bundleId} />
            <button
              type="submit"
              className="bundle-actions-menu__item"
              role="menuitem"
              disabled={isSubmitting}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setOpen(false)}
            >
              Pause
            </button>
          </Form>
        )}

        {status === "paused" && (
          <Form method="post" className="bundle-actions-menu__form">
            <input type="hidden" name="intent" value="resume" />
            <input type="hidden" name="id" value={bundleId} />
            <button
              type="submit"
              className="bundle-actions-menu__item"
              role="menuitem"
              disabled={isSubmitting}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setOpen(false)}
            >
              Resume
            </button>
          </Form>
        )}

        <Form method="post" className="bundle-actions-menu__form">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={bundleId} />
          <button
            type="submit"
            className="bundle-actions-menu__item bundle-actions-menu__item--danger"
            role="menuitem"
            disabled={isSubmitting}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen(false)}
          >
            Delete
          </button>
        </Form>
      </div>,
      document.body,
    );

  return (
    <div className="bundle-actions-menu">
      <button
        ref={triggerRef}
        type="button"
        className="bundle-actions-menu__trigger"
        aria-label="Bundle actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggleMenu}
      >
        <span className="bundle-actions-menu__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      {dropdown}
    </div>
  );
}
