import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

const TOAST_MESSAGES: Record<string, string> = {
  created: "Bundle created and saved as draft",
  saved: "Bundle saved",
  published: "Bundle published to your storefront",
};

export function useEditorToast() {
  const [searchParams] = useSearchParams();
  const shopify = useAppBridge();
  const shopifyRef = useRef(shopify);
  shopifyRef.current = shopify;
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const toastKey = searchParams.get("toast");
    if (!toastKey || !TOAST_MESSAGES[toastKey]) return;
    if (handledRef.current === toastKey) return;

    handledRef.current = toastKey;
    shopifyRef.current.toast.show(TOAST_MESSAGES[toastKey]);

    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    const next = url.pathname + url.search + url.hash;
    window.history.replaceState(window.history.state, "", next);
  }, [searchParams]);
}
