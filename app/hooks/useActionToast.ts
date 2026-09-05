import { useEffect, useRef } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

export function useActionToast(
  actionData: unknown,
  messages: Record<string, string>,
  errorKey = "error",
) {
  const shopify = useAppBridge();
  const shopifyRef = useRef(shopify);
  shopifyRef.current = shopify;
  const handledRef = useRef<unknown>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (!actionData || actionData === handledRef.current) return;
    handledRef.current = actionData;

    const data = actionData as Record<string, unknown>;
    if (errorKey in data && data[errorKey]) {
      shopifyRef.current.toast.show(String(data[errorKey]), { isError: true });
      return;
    }

    if ("ok" in data && data.ok && typeof data.intent === "string") {
      const message = messagesRef.current[data.intent];
      if (message) shopifyRef.current.toast.show(message);
    }
  }, [actionData, errorKey]);
}
