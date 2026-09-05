import { useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getBundleType, EDITOR_ENABLED_TYPES } from "../constants/bundle-types";
import { createEditorStateForBundleType } from "../constants/bundle-editor-defaults";
import { BundleEditor } from "../components/bundle-editor/BundleEditor";
import { fetchPreviewProducts } from "../services/bundle-editor.server";
import { handleBundleEditorAction } from "../services/bundle-save.server";
import { useBundleEditorForm } from "../hooks/useBundleEditorForm";
import { useEditorToast } from "../hooks/useEditorToast";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const bundleType = getBundleType(params.type ?? "");

  if (!bundleType) {
    throw redirect("/app/bundles/new");
  }

  const products = await fetchPreviewProducts(admin);
  const editorState = {
    ...createEditorStateForBundleType(bundleType.id),
    previewProductId: products[0]?.id,
  };

  return { bundleType, products, editorState };
};

export const action = async (args: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(args.request);
  const bundleType = getBundleType(args.params.type ?? "");

  if (!bundleType) {
    return redirect("/app/bundles/new");
  }

  if (EDITOR_ENABLED_TYPES.includes(bundleType.id)) {
    return handleBundleEditorAction({ ...args, admin, session });
  }

  return { error: "This bundle type is not supported yet." };
};

export default function NewBundleByType() {
  const { bundleType, products, editorState } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const shopifyRef = useRef(shopify);
  shopifyRef.current = shopify;
  const handledErrorRef = useRef<unknown>(null);
  const form = useBundleEditorForm(editorState);
  useEditorToast();

  useEffect(() => {
    if (!actionData || !("error" in actionData) || !actionData.error) return;
    if (actionData === handledErrorRef.current) return;
    handledErrorRef.current = actionData;
    shopifyRef.current.toast.show(actionData.error, { isError: true });
  }, [actionData]);

  return (
    <BundleEditor
      form={form}
      products={products}
      bundleTypeId={bundleType.id}
      bundleStatus="draft"
      isSubmitting={navigation.state === "submitting"}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
