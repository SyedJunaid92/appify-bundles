// @ts-check

/**
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/** @type {CartLinesDiscountsGenerateRunResult} */
const NO_DISCOUNTS = { operations: [] };

const PRIORITY = { gift: 400, bogo: 300, instance: 200, quantity: 100 };

function parseOffers(raw) {
  if (!raw) return [];
  if (Array.isArray(raw?.offers)) return raw.offers;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.offers) ? parsed.offers : [];
    } catch {
      return [];
    }
  }
  return [];
}

function matchTier(quantity, tiers) {
  if (!tiers?.length || quantity <= 0) return null;
  const sorted = [...tiers].sort((a, b) => a.q - b.q);
  let matched = null;
  for (const tier of sorted) {
    if (quantity >= tier.q) matched = tier;
  }
  return matched;
}

function allocateFixed(lines, discount) {
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  if (total <= 0 || discount <= 0) return [];
  const capped = Math.min(discount, total);
  const allocated = [];
  let remaining = capped;
  lines.forEach((line, index) => {
    const share =
      index === lines.length - 1
        ? remaining
        : Math.round(((capped * line.amount) / total) * 100) / 100;
    const amount = Math.max(0, Math.min(share, remaining, line.amount));
    remaining = Math.round((remaining - amount) * 100) / 100;
    if (amount > 0) allocated.push({ id: line.id, amount });
  });
  return allocated;
}

function applyTier(lines, tier, message, priority) {
  if (!tier || tier.t === "full") return [];
  if (tier.t === "p") {
    return lines
      .filter((line) => line.lineAmount > 0)
      .map((line) => ({
        message,
        lineId: line.id,
        kind: "percentage",
        value: tier.v,
        priority,
      }));
  }
  if (tier.t === "r") {
    return lines
      .filter((line) => line.lineAmount > 0)
      .map((line) => ({
        message,
        lineId: line.id,
        kind: "percentage",
        value: 100,
        priority,
      }));
  }
  const groupAmount = lines.reduce((sum, line) => sum + line.lineAmount, 0);
  let discount = 0;
  if (tier.t === "f") discount = Number(tier.v) || 0;
  if (tier.t === "l") discount = Math.max(0, groupAmount - Number(tier.fp || tier.v || 0));
  return allocateFixed(
    lines.map((line) => ({ id: line.id, amount: line.lineAmount })),
    discount,
  ).map((row) => ({
    message,
    lineId: row.id,
    kind: "fixed",
    value: row.amount,
    priority,
  }));
}

function idsEqual(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return String(a).replace(/^gid:\/\/shopify\/[^/]+\//, "") ===
    String(b).replace(/^gid:\/\/shopify\/[^/]+\//, "");
}

function productInList(ids, productId) {
  return (ids || []).some((id) => idsEqual(id, productId));
}

function toLine(raw) {
  const merch = raw.merchandise;
  const variant = merch && merch.__typename === "ProductVariant" ? merch : null;
  return {
    id: raw.id,
    quantity: raw.quantity,
    variantId: variant?.id,
    productId: variant?.product?.id,
    unitAmount: Number(raw.cost?.amountPerQuantity?.amount || 0),
    lineAmount: Number(raw.cost?.subtotalAmount?.amount || 0),
    bundleId: raw.bundleId?.value || null,
    instance: raw.instance?.value || null,
    role: raw.role?.value || null,
    kind: raw.kind?.value || null,
    gift: raw.gift?.value === "1" || raw.gift?.value === "true",
    inAnyCollection: Boolean(variant?.product?.inAnyCollection),
  };
}

function inScope(offer, line) {
  if (productInList(offer.xp, line.productId)) return false;
  if (offer.sc === "all") return true;
  if (offer.sc === "sel") return productInList(offer.p, line.productId);
  if (offer.sc === "col") return Boolean(line.inAnyCollection);
  return false;
}

function eligible(offer, lines) {
  return lines.filter((line) => {
    if (offer.wo && line.bundleId !== offer.id) return false;
    if (line.bundleId && line.bundleId !== offer.id) return false;
    return inScope(offer, line);
  });
}

function groupKey(line, offer) {
  return line.instance ? `${offer.id}:${line.instance}` : offer.id;
}

function variantMatch(itemVariant, line) {
  return idsEqual(itemVariant, line.variantId);
}

function isSpecial(line) {
  return (
    line.kind === "complete" ||
    line.kind === "bogo" ||
    line.role === "addon" ||
    line.role === "reward"
  );
}

function completeBundle(offer, lines) {
  const grouped = new Map();
  for (const line of eligible(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) || [];
    list.push(line);
    grouped.set(key, list);
  }
  const completeTier = (offer.tiers || []).find((tier) => tier.k === "complete") || offer.tiers?.[0];
  const out = [];
  for (const group of grouped.values()) {
    const isComplete = group.some(
      (line) => line.kind === "complete" || line.role === "addon",
    );
    if (!isComplete) continue;
    for (const line of group) {
      const item = (offer.items || []).find((entry) => variantMatch(entry.v, line));
      if (item?.d > 0) {
        out.push({
          message: offer.name,
          lineId: line.id,
          kind: item.t === "f" ? "fixed" : "percentage",
          value: item.t === "f" ? item.d * line.quantity : item.d,
          priority: PRIORITY.instance,
        });
        continue;
      }
      if ((line.role === "trigger" || line.role === "required" || !line.role) && completeTier) {
        out.push(...applyTier([line], completeTier, offer.name, PRIORITY.instance));
      }
    }
  }
  return out;
}

function quantityBreak(offer, lines) {
  const grouped = new Map();
  for (const line of eligible(offer, lines)) {
    if (line.gift || isSpecial(line)) continue;
    const key = `${groupKey(line, offer)}:${line.variantId || line.id}`;
    const list = grouped.get(key) || [];
    list.push(line);
    grouped.set(key, list);
  }
  const out = [];
  for (const group of grouped.values()) {
    const qty = group.reduce((sum, line) => sum + line.quantity, 0);
    const tier = matchTier(qty, offer.tiers);
    if (tier) out.push(...applyTier(group, tier, offer.name, PRIORITY.quantity));
  }
  return out;
}

function bogo(offer, lines) {
  const buy = offer.bogo?.b ?? 1;
  const get = offer.bogo?.g ?? 1;
  const max = offer.bogo?.max ?? 1;
  const rewardType = offer.bogo?.t ?? "r";
  const rewardValue = offer.bogo?.v ?? 100;
  const grouped = new Map();
  for (const line of eligible(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) || [];
    list.push(line);
    grouped.set(key, list);
  }
  const out = [];
  for (const group of grouped.values()) {
    const rewardLines = group.filter((line) => line.role === "reward");
    const triggerLines = rewardLines.length ? rewardLines : group;
    const triggerQty = group
      .filter((line) => line.role !== "reward")
      .reduce((sum, line) => sum + line.quantity, 0);
    const units = triggerQty || group.reduce((sum, line) => sum + line.quantity, 0);
    let redeemable = Math.floor(units / (buy + (rewardLines.length ? 0 : get))) * get;
    if (rewardLines.length) redeemable = Math.floor((triggerQty || units) / buy) * get;
    if (max > 0) redeemable = Math.min(redeemable, max * get);
    if (redeemable <= 0) continue;
    const exploded = triggerLines
      .flatMap((line) =>
        Array.from({ length: line.quantity }, () => ({
          lineId: line.id,
          unit: line.unitAmount,
        })),
      )
      .sort((a, b) => a.unit - b.unit)
      .slice(0, redeemable);
    const byLine = new Map();
    for (const unit of exploded) {
      byLine.set(unit.lineId, (byLine.get(unit.lineId) || 0) + 1);
    }
    for (const line of triggerLines) {
      const discountedUnits = byLine.get(line.id) || 0;
      if (!discountedUnits) continue;
      if (rewardType === "r" || rewardValue >= 100) {
        const amount = Math.round(line.unitAmount * discountedUnits * 100) / 100;
        if (amount > 0) {
          out.push({
            message: offer.name,
            lineId: line.id,
            kind: "fixed",
            value: amount,
            priority: PRIORITY.bogo,
          });
        }
      } else {
        out.push({
          message: offer.name,
          lineId: line.id,
          kind: "percentage",
          value: Math.round(rewardValue * (discountedUnits / line.quantity) * 100) / 100,
          priority: PRIORITY.bogo,
        });
      }
    }
  }
  return out;
}

function mixMatch(offer, lines) {
  const grouped = new Map();
  for (const line of eligible(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) || [];
    list.push(line);
    grouped.set(key, list);
  }
  const out = [];
  for (const group of grouped.values()) {
    const qty = group.reduce((sum, line) => sum + line.quantity, 0);
    const tier = matchTier(qty, offer.tiers);
    if (tier) out.push(...applyTier(group, tier, offer.name, PRIORITY.instance));
  }
  return out;
}

function fixedBundle(offer, lines) {
  const required = (offer.items || []).filter((item) => item.r === "required");
  const grouped = new Map();
  for (const line of eligible(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) || [];
    list.push(line);
    grouped.set(key, list);
  }
  const out = [];
  for (const group of grouped.values()) {
    const hasAll =
      required.length === 0 ||
      required.every((item) => group.some((line) => variantMatch(item.v, line)));
    if (!hasAll) continue;
    const tier = offer.tiers?.[0];
    if (tier) out.push(...applyTier(group, tier, offer.name, PRIORITY.instance));
  }
  return out;
}

function fbt(offer, lines) {
  const grouped = new Map();
  for (const line of eligible(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) || [];
    list.push(line);
    grouped.set(key, list);
  }
  const mode = offer.fbt?.mode || "addons";
  const minSelect = offer.fbt?.min || 2;
  const out = [];
  for (const group of grouped.values()) {
    const hasTrigger = group.some((line) => line.role === "trigger" || !line.role);
    if (!hasTrigger) continue;
    const addons = group.filter((line) => line.role === "addon");
    const tier = offer.tiers?.[0];
    if (!tier) continue;
    if (mode === "combo") {
      if (group.length < minSelect) continue;
      out.push(...applyTier(group, tier, offer.name, PRIORITY.instance));
    } else if (addons.length) {
      out.push(...applyTier(addons, tier, offer.name, PRIORITY.instance));
    }
  }
  return out;
}

function merchTotals(lines) {
  return lines
    .filter((line) => !line.gift)
    .reduce(
      (acc, line) => ({
        qty: acc.qty + line.quantity,
        amount: acc.amount + line.lineAmount,
      }),
      { qty: 0, amount: 0 },
    );
}

function giftMet(offer, lines) {
  if (!offer.gift) return false;
  const merch = merchTotals(lines);
  return offer.gift.by === "q" ? merch.qty >= offer.gift.min : merch.amount >= offer.gift.min;
}

function gifts(offer, lines) {
  if (!giftMet(offer, lines)) return [];
  const giftVariants = (offer.items || []).filter((item) => item.r === "gift").map((item) => item.v);
  return lines
    .filter(
      (line) =>
        line.gift &&
        (giftVariants.length === 0 || giftVariants.some((id) => variantMatch(id, line))),
    )
    .map((line) => ({
      message: offer.name,
      lineId: line.id,
      kind: "percentage",
      value: 100,
      priority: PRIORITY.gift,
    }));
}

function computeCandidates(offers, lines, isB2b) {
  const all = [];
  for (const offer of offers) {
    if (offer.xb2b && isB2b) continue;
    if (offer.b2b && !isB2b) continue;
    switch (offer.type) {
      case "quantity_break":
        all.push(...quantityBreak(offer, lines));
        all.push(...completeBundle(offer, lines));
        if (offer.bogo) all.push(...bogo(offer, lines));
        break;
      case "bogo":
        all.push(...bogo(offer, lines));
        break;
      case "mix_match":
        all.push(...mixMatch(offer, lines));
        break;
      case "fixed_bundle":
        all.push(...completeBundle(offer, lines));
        all.push(...fixedBundle(offer, lines));
        break;
      case "fbt_upsell":
        all.push(...fbt(offer, lines));
        break;
      case "gifts":
        all.push(...gifts(offer, lines));
        break;
      default:
        break;
    }
  }
  const best = new Map();
  for (const candidate of all) {
    const current = best.get(candidate.lineId);
    if (!current || candidate.priority > current.priority) best.set(candidate.lineId, candidate);
  }
  return [...best.values()];
}

function toOperations(candidates) {
  if (!candidates.length) return NO_DISCOUNTS;
  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: candidates.map((candidate) =>
            candidate.kind === "fixed"
              ? {
                  message: candidate.message || "Bundle savings",
                  targets: [{ cartLine: { id: candidate.lineId } }],
                  value: {
                    fixedAmount: {
                      amount: Number(candidate.value).toFixed(2),
                      appliesToEachItem: false,
                    },
                  },
                }
              : {
                  message: candidate.message || "Bundle savings",
                  targets: [{ cartLine: { id: candidate.lineId } }],
                  value: {
                    percentage: { value: Number(candidate.value).toFixed(2) },
                  },
                },
          ),
          selectionStrategy: "ALL",
        },
      },
    ],
  };
}

export function cartLinesDiscountsGenerateRun(input) {
  const classes = input.discount?.discountClasses ?? [];
  if (!classes.includes("PRODUCT")) return NO_DISCOUNTS;
  const offers = parseOffers(input.discount?.offers?.jsonValue ?? input.discount?.offers);
  if (!offers.length) return NO_DISCOUNTS;
  const lines = (input.cart?.lines ?? []).map(toLine);
  const isB2b = Boolean(input.cart?.buyerIdentity?.purchasingCompany);
  return toOperations(computeCandidates(offers, lines, isB2b));
}

export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const classes = input.discount?.discountClasses ?? [];
  if (!classes.includes("SHIPPING")) return NO_DISCOUNTS;
  const offers = parseOffers(input.discount?.offers?.jsonValue ?? input.discount?.offers);
  const lines = (input.cart?.lines ?? []).map(toLine);
  const isB2b = Boolean(input.cart?.buyerIdentity?.purchasingCompany);
  const shippingOffer = offers.find((offer) => {
    if (offer.type !== "gifts" || !offer.gift?.ship) return false;
    if (offer.xb2b && isB2b) return false;
    if (offer.b2b && !isB2b) return false;
    return giftMet(offer, lines);
  });
  if (!shippingOffer) return NO_DISCOUNTS;
  const groups = input.cart?.deliveryGroups ?? [];
  if (!groups.length) return NO_DISCOUNTS;
  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: groups.map((group) => ({
            message: shippingOffer.name || "Free shipping",
            targets: [{ deliveryGroup: { id: group.id } }],
            value: { percentage: { value: "100.0" } },
          })),
          selectionStrategy: "ALL",
        },
      },
    ],
  };
}
