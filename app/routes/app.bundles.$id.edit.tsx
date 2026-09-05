import { useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getBundleById } from "../models/bundle.server";
import { resolveBundleTypeId } from "../constants/bundle-types";
import { editorStateFromBundle } from "../constants/bundle-editor-defaults";
import { BundleEditor } from "../components/bundle-editor/BundleEditor";
import {
  fetchPreviewProducts,
  fetchProductsByIds,
} from "../services/bundle-editor.server";
import { handleBundleEditorAction } from "../services/bundle-save.server";
import { useBundleEditorForm } from "../hooks/useBundleEditorForm";
import { useEditorToast } from "../hooks/useEditorToast";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const bundle = await getBundleById(session.shop, params.id!);

  if (!bundle) {
    throw new Response("Bundle not found", { status: 404 });
  }

  const catalog = await fetchPreviewProducts(admin);
  const editorState = editorStateFromBundle(bundle);
  const selected = await fetchProductsByIds(
    admin,
    editorState.selectedProductIds ?? [],
  );
  const products = [
    ...selected,
    ...catalog.filter((item) => !selected.some((picked) => picked.id === item.id)),
  ];

  if (!editorState.previewProductId && products[0]) {
    editorState.previewProductId = products[0].id;
  }

  return {
    bundle,
    products,
    editorState,
    bundleTypeId: resolveBundleTypeId(bundle.type, bundle.layout),
  };
};

export const action = async (args: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(args.request);
  return handleBundleEditorAction({ ...args, admin, session });
};

export default function EditBundle() {
  const { bundle, products, editorState, bundleTypeId } =
    useLoaderData<typeof loader>();
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
      bundleId={bundle.id}
      bundleTypeId={bundleTypeId}
      bundleStatus={bundle.status}
      isSubmitting={navigation.state === "submitting"}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
