import { useCallback } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import type { BundleEditorState } from "../types/bundle-editor";
import { validateBundleEditorSubmit } from "../schemas/bundle-editor.schema";

export interface BundleEditorForm extends UseFormReturn<BundleEditorState> {
  getValidatedState: () =>
    | { success: true; data: BundleEditorState }
    | { success: false; error: string };
  updateState: (patch: Partial<BundleEditorState>) => void;
  replaceState: (state: BundleEditorState) => void;
}

export function useBundleEditorForm(
  initialState: BundleEditorState,
): BundleEditorForm {
  const form = useForm<BundleEditorState>({
    defaultValues: initialState,
    mode: "onChange",
  });

  const getValidatedState = useCallback(() => {
    const values = form.getValues();
    const result = validateBundleEditorSubmit(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          form.setError(field as keyof BundleEditorState, {
            message: issue.message,
          });
        }
      }
      const firstIssue = result.error.issues[0];
      return {
        success: false as const,
        error: firstIssue?.message ?? "Invalid bundle configuration",
      };
    }
    return { success: true as const, data: values };
  }, [form]);

  const updateState = useCallback(
    (patch: Partial<BundleEditorState>) => {
      const current = form.getValues();
      form.reset({ ...current, ...patch }, { keepDefaultValues: false });
    },
    [form],
  );

  const replaceState = useCallback(
    (state: BundleEditorState) => {
      form.reset(state, { keepDefaultValues: false });
    },
    [form],
  );

  return {
    ...form,
    getValidatedState,
    updateState,
    replaceState,
  };
}
