// @ts-check

/**
 * @typedef {import("../generated/api").CartTransformRunInput} CartTransformRunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 */

/** @type {CartTransformRunResult} */
const NO_CHANGES = { operations: [] };

/**
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  /** @type {CartTransformRunResult["operations"]} */
  const operations = [];

  for (const cartLine of input.cart.lines) {
    const expandOp = buildExpandOperation(cartLine);
    if (expandOp) {
      operations.push({ lineExpand: expandOp });
    }
  }

  operations.push(...buildMergeOperations(input));

  return operations.length > 0 ? { operations } : NO_CHANGES;
}

/**
 * @param {CartTransformRunInput["cart"]["lines"][number]} cartLine
 */
function buildExpandOperation(cartLine) {
  const { id: cartLineId, merchandise } = cartLine;

  if (merchandise.__typename !== "ProductVariant") return null;

  const refs = merchandise.componentReferences?.value;
  const qtys = merchandise.componentQuantities?.value;

  if (!refs || !qtys) return null;

  const componentReferences = JSON.parse(refs);
  const componentQuantities = JSON.parse(qtys);

  if (
    !Array.isArray(componentReferences) ||
    componentReferences.length === 0 ||
    componentReferences.length !== componentQuantities.length
  ) {
    return null;
  }

  return {
    cartLineId,
    expandedCartItems: componentReferences.map((merchandiseId, index) => ({
      merchandiseId,
      quantity: componentQuantities[index],
    })),
  };
}

/**
 * @param {CartTransformRunInput} input
 */
function buildMergeOperations(input) {
  /** @type {Map<string, { parentVariantId: string; lineIds: string[]; title: string }>} */
  const mergeCandidates = new Map();

  for (const cartLine of input.cart.lines) {
    const { id, merchandise } = cartLine;
    if (merchandise.__typename !== "ProductVariant") continue;

    const parentsRaw = merchandise.componentParents?.value;
    if (!parentsRaw) continue;

    /** @type {Array<{ parentVariantId: string; bundleId: string }>} */
    let parents = [];
    try {
      parents = JSON.parse(parentsRaw);
    } catch {
      continue;
    }

    for (const parent of parents) {
      const key = parent.bundleId;
      const existing = mergeCandidates.get(key);
      if (existing) {
        existing.lineIds.push(id);
      } else {
        mergeCandidates.set(key, {
          parentVariantId: parent.parentVariantId,
          lineIds: [id],
          title: "Bundle",
        });
      }
    }
  }

  /** @type {CartTransformRunResult["operations"]} */
  const operations = [];

  for (const candidate of mergeCandidates.values()) {
    if (candidate.lineIds.length < 2) continue;

    operations.push({
      linesMerge: {
        cartLines: candidate.lineIds.map((cartLineId) => ({ cartLineId })),
        parentVariantId: candidate.parentVariantId,
        title: candidate.title,
      },
    });
  }

  return operations;
}
