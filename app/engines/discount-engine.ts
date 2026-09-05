import type { CompiledOffer, CompiledOffersPayload, CompiledTier } from "./offer";

export type CartLineInput = {
  id: string;
  quantity: number;
  variantId?: string;
  productId?: string;
  unitAmount: number;
  lineAmount: number;
  bundleId?: string | null;
  instance?: string | null;
  role?: string | null;
  kind?: string | null;
  gift?: boolean;
  inAnyCollection?: boolean;
};

export type DiscountCandidate = {
  message: string;
  lineId: string;
  kind: "percentage" | "fixed";
  value: number;
  priority: number;
};

export type ShippingDiscount = {
  message: string;
};

const PRIORITY = {
  gift: 400,
  bogo: 300,
  instance: 200,
  quantity: 100,
};

function matchTier(quantity: number, tiers: CompiledTier[]): CompiledTier | null {
  if (!tiers.length || quantity <= 0) return null;
  const sorted = [...tiers].sort((a, b) => a.q - b.q);
  let matched: CompiledTier | null = null;
  for (const tier of sorted) {
    if (quantity >= tier.q) matched = tier;
  }
  return matched;
}

function allocateFixed(
  lines: Array<{ id: string; amount: number }>,
  discount: number,
): Array<{ id: string; amount: number }> {
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  if (total <= 0 || discount <= 0) return [];
  const capped = Math.min(discount, total);
  const allocated: Array<{ id: string; amount: number }> = [];
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

function applyTierToLines(
  lines: CartLineInput[],
  tier: CompiledTier,
  message: string,
  priority: number,
): DiscountCandidate[] {
  if (tier.t === "full" || (tier.t !== "r" && tier.v <= 0 && !tier.fp)) {
    return [];
  }

  if (tier.t === "p") {
    return lines
      .filter((line) => line.lineAmount > 0)
      .map((line) => ({
        message,
        lineId: line.id,
        kind: "percentage" as const,
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
        kind: "percentage" as const,
        value: 100,
        priority,
      }));
  }

  const groupAmount = lines.reduce((sum, line) => sum + line.lineAmount, 0);
  let discount = 0;
  if (tier.t === "f") discount = tier.v;
  if (tier.t === "l") discount = Math.max(0, groupAmount - Number(tier.fp || tier.v || 0));

  return allocateFixed(
    lines.map((line) => ({ id: line.id, amount: line.lineAmount })),
    discount,
  ).map((row) => ({
    message,
    lineId: row.id,
    kind: "fixed" as const,
    value: row.amount,
    priority,
  }));
}

function groupKey(line: CartLineInput, offer: CompiledOffer) {
  if (line.instance) return `${offer.id}:${line.instance}`;
  return offer.id;
}

function variantMatches(itemVariant: string | undefined, line: CartLineInput) {
  if (!itemVariant) return false;
  return (
    itemVariant === line.variantId ||
    String(itemVariant).replace(/^gid:\/\/shopify\/ProductVariant\//, "") ===
      String(line.variantId || "").replace(/^gid:\/\/shopify\/ProductVariant\//, "")
  );
}

function productInList(ids: string[], line: CartLineInput) {
  if (!line.productId) return false;
  return ids.some((id) => {
    const a = String(id).replace(/^gid:\/\/shopify\/Product\//, "");
    const b = String(line.productId).replace(/^gid:\/\/shopify\/Product\//, "");
    return id === line.productId || a === b;
  });
}

function lineInOfferScope(offer: CompiledOffer, line: CartLineInput) {
  if (productInList(offer.xp, line)) return false;
  if (offer.sc === "all") return true;
  if (offer.sc === "sel") return productInList(offer.p, line);
  if (offer.sc === "col") return Boolean(line.inAnyCollection);
  return false;
}

function eligibleLines(offer: CompiledOffer, lines: CartLineInput[]) {
  return lines.filter((line) => {
    if (offer.wo && line.bundleId !== offer.id) return false;
    if (line.bundleId && line.bundleId !== offer.id) return false;
    if (!offer.wo && line.bundleId && line.bundleId !== offer.id) return false;
    return lineInOfferScope(offer, line);
  });
}

function isSpecialInstance(line: CartLineInput) {
  return (
    line.kind === "complete" ||
    line.kind === "bogo" ||
    line.role === "addon" ||
    line.role === "reward"
  );
}

function computeCompleteBundle(offer: CompiledOffer, lines: CartLineInput[]) {
  const candidates: DiscountCandidate[] = [];
  const grouped = new Map<string, CartLineInput[]>();
  for (const line of eligibleLines(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) ?? [];
    list.push(line);
    grouped.set(key, list);
  }

  const completeTier = offer.tiers.find((tier) => tier.k === "complete") ?? offer.tiers[0];

  for (const group of grouped.values()) {
    const isComplete = group.some(
      (line) => line.kind === "complete" || line.role === "addon",
    );
    if (!isComplete) continue;

    for (const line of group) {
      const item = offer.items.find((entry) => variantMatches(entry.v, line));
      if (item?.d && item.d > 0) {
        candidates.push({
          message: offer.name,
          lineId: line.id,
          kind: item.t === "f" ? "fixed" : "percentage",
          value: item.t === "f" ? item.d * line.quantity : item.d,
          priority: PRIORITY.instance,
        });
        continue;
      }
      if (
        (line.role === "trigger" || line.role === "required" || !line.role) &&
        completeTier
      ) {
        candidates.push(
          ...applyTierToLines([line], completeTier, offer.name, PRIORITY.instance),
        );
      }
    }
  }
  return candidates;
}

function computeQuantityBreak(offer: CompiledOffer, lines: CartLineInput[]) {
  const candidates: DiscountCandidate[] = [];
  const grouped = new Map<string, CartLineInput[]>();
  for (const line of eligibleLines(offer, lines)) {
    if (line.gift || isSpecialInstance(line)) continue;
    const key = `${groupKey(line, offer)}:${line.variantId || line.id}`;
    const list = grouped.get(key) ?? [];
    list.push(line);
    grouped.set(key, list);
  }
  for (const group of grouped.values()) {
    const qty = group.reduce((sum, line) => sum + line.quantity, 0);
    const tier = matchTier(qty, offer.tiers);
    if (!tier) continue;
    candidates.push(
      ...applyTierToLines(group, tier, offer.name, PRIORITY.quantity),
    );
  }
  return candidates;
}

function computeBogo(offer: CompiledOffer, lines: CartLineInput[]) {
  const buy = offer.bogo?.b ?? 1;
  const get = offer.bogo?.g ?? 1;
  const max = offer.bogo?.max ?? 1;
  const rewardType = offer.bogo?.t ?? "r";
  const rewardValue = offer.bogo?.v ?? 100;
  const message = offer.name;
  const candidates: DiscountCandidate[] = [];

  const grouped = new Map<string, CartLineInput[]>();
  for (const line of eligibleLines(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) ?? [];
    list.push(line);
    grouped.set(key, list);
  }

  for (const group of grouped.values()) {
    const rewardLines = group.filter((line) => line.role === "reward");
    const triggerLines = rewardLines.length ? rewardLines : group;
    const triggerQty = group
      .filter((line) => line.role !== "reward")
      .reduce((sum, line) => sum + line.quantity, 0);
    const units = triggerQty || group.reduce((sum, line) => sum + line.quantity, 0);
    let redeemable = Math.floor(units / (buy + (rewardLines.length ? 0 : get))) * get;
    if (rewardLines.length) {
      redeemable = Math.floor((triggerQty || units) / buy) * get;
    }
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

    const byLine = new Map<string, number>();
    for (const unit of exploded) {
      byLine.set(unit.lineId, (byLine.get(unit.lineId) ?? 0) + 1);
    }

    for (const line of triggerLines) {
      const discountedUnits = byLine.get(line.id) ?? 0;
      if (!discountedUnits) continue;
      if (rewardType === "r" || rewardValue >= 100) {
        const amount = Math.round(line.unitAmount * discountedUnits * 100) / 100;
        if (amount > 0) {
          candidates.push({
            message,
            lineId: line.id,
            kind: "fixed",
            value: amount,
            priority: PRIORITY.bogo,
          });
        }
      } else {
        const portion = discountedUnits / line.quantity;
        candidates.push({
          message,
          lineId: line.id,
          kind: "percentage",
          value: Math.round(rewardValue * portion * 100) / 100,
          priority: PRIORITY.bogo,
        });
      }
    }
  }

  return candidates;
}

function computeMixMatch(offer: CompiledOffer, lines: CartLineInput[]) {
  const candidates: DiscountCandidate[] = [];
  const grouped = new Map<string, CartLineInput[]>();
  const poolVariants = offer.items.filter((item) => item.r === "pool").map((item) => item.v);

  for (const line of eligibleLines(offer, lines)) {
    if (line.gift) continue;
    if (poolVariants.length && !poolVariants.some((id) => variantMatches(id, line))) {
      if (!lineInOfferScope(offer, line)) continue;
    }
    const key = groupKey(line, offer);
    const list = grouped.get(key) ?? [];
    list.push(line);
    grouped.set(key, list);
  }

  for (const group of grouped.values()) {
    const qty = group.reduce((sum, line) => sum + line.quantity, 0);
    const tier = matchTier(qty, offer.tiers);
    if (!tier) continue;
    candidates.push(
      ...applyTierToLines(group, tier, offer.name, PRIORITY.instance),
    );
  }
  return candidates;
}

function computeFixedBundle(offer: CompiledOffer, lines: CartLineInput[]) {
  const required = offer.items.filter((item) => item.r === "required");
  const grouped = new Map<string, CartLineInput[]>();
  for (const line of eligibleLines(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) ?? [];
    list.push(line);
    grouped.set(key, list);
  }

  const candidates: DiscountCandidate[] = [];
  for (const group of grouped.values()) {
    const hasAllRequired =
      required.length === 0 ||
      required.every((item) =>
        group.some((line) => variantMatches(item.v, line) && line.quantity >= (1)),
      );
    if (!hasAllRequired) continue;
    const tier = offer.tiers[0];
    if (!tier) continue;
    candidates.push(
      ...applyTierToLines(group, tier, offer.name, PRIORITY.instance),
    );
  }
  return candidates;
}

function computeFbt(offer: CompiledOffer, lines: CartLineInput[]) {
  const grouped = new Map<string, CartLineInput[]>();
  for (const line of eligibleLines(offer, lines)) {
    if (line.gift) continue;
    const key = groupKey(line, offer);
    const list = grouped.get(key) ?? [];
    list.push(line);
    grouped.set(key, list);
  }

  const mode = offer.fbt?.mode ?? "addons";
  const minSelect = offer.fbt?.min ?? 2;
  const candidates: DiscountCandidate[] = [];

  for (const group of grouped.values()) {
    const hasTrigger = group.some((line) => line.role === "trigger" || !line.role);
    if (!hasTrigger) continue;
    const addons = group.filter((line) => line.role === "addon");
    const selectedCount = group.length;
    const tier = offer.tiers[0];
    if (!tier) continue;

    if (mode === "combo") {
      if (selectedCount < minSelect) continue;
      candidates.push(
        ...applyTierToLines(group, tier, offer.name, PRIORITY.instance),
      );
      continue;
    }

    if (addons.length === 0) continue;
    candidates.push(
      ...applyTierToLines(addons, tier, offer.name, PRIORITY.instance),
    );
  }
  return candidates;
}

function nonGiftMerchandise(lines: CartLineInput[]) {
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

function giftThresholdMet(offer: CompiledOffer, lines: CartLineInput[]) {
  if (!offer.gift) return false;
  const merch = nonGiftMerchandise(lines);
  if (offer.gift.by === "q") return merch.qty >= offer.gift.min;
  return merch.amount >= offer.gift.min;
}

function computeGifts(offer: CompiledOffer, lines: CartLineInput[]) {
  if (!giftThresholdMet(offer, lines)) return [];
  const giftVariants = offer.items.filter((item) => item.r === "gift").map((item) => item.v);
  return lines
    .filter(
      (line) =>
        line.gift &&
        (giftVariants.length === 0 || giftVariants.some((id) => variantMatches(id, line))),
    )
    .map((line) => ({
      message: offer.name,
      lineId: line.id,
      kind: "percentage" as const,
      value: 100,
      priority: PRIORITY.gift,
    }));
}

export function computeProductDiscounts(
  payload: CompiledOffersPayload,
  lines: CartLineInput[],
  options: { isB2b?: boolean } = {},
) {
  const isB2b = Boolean(options.isB2b);
  const all: DiscountCandidate[] = [];

  for (const offer of payload.offers) {
    if (offer.xb2b && isB2b) continue;
    if (offer.b2b && !isB2b) continue;

    switch (offer.type) {
      case "quantity_break":
        all.push(...computeQuantityBreak(offer, lines));
        all.push(...computeCompleteBundle(offer, lines));
        if (offer.bogo) all.push(...computeBogo(offer, lines));
        break;
      case "bogo":
        all.push(...computeBogo(offer, lines));
        break;
      case "mix_match":
        all.push(...computeMixMatch(offer, lines));
        break;
      case "fixed_bundle":
        all.push(...computeCompleteBundle(offer, lines));
        all.push(...computeFixedBundle(offer, lines));
        break;
      case "fbt_upsell":
        all.push(...computeFbt(offer, lines));
        break;
      case "gifts":
        all.push(...computeGifts(offer, lines));
        break;
      default:
        break;
    }
  }

  const bestByLine = new Map<string, DiscountCandidate>();
  for (const candidate of all) {
    const current = bestByLine.get(candidate.lineId);
    if (!current || candidate.priority > current.priority) {
      bestByLine.set(candidate.lineId, candidate);
    }
  }
  return [...bestByLine.values()];
}

export function computeShippingDiscount(
  payload: CompiledOffersPayload,
  lines: CartLineInput[],
  options: { isB2b?: boolean } = {},
): ShippingDiscount | null {
  const isB2b = Boolean(options.isB2b);
  for (const offer of payload.offers) {
    if (offer.type !== "gifts" || !offer.gift?.ship) continue;
    if (offer.xb2b && isB2b) continue;
    if (offer.b2b && !isB2b) continue;
    if (!giftThresholdMet(offer, lines)) continue;
    return { message: offer.name || "Free shipping" };
  }
  return null;
}

export function isGiftLineAllowed(
  payload: CompiledOffersPayload,
  lines: CartLineInput[],
) {
  const giftLines = lines.filter((line) => line.gift);
  if (giftLines.length === 0) return { ok: true as const };

  const allowed = payload.offers.some(
    (offer) => offer.type === "gifts" && giftThresholdMet(offer, lines),
  );
  if (!allowed) {
    return {
      ok: false as const,
      message: "Remove the free gift or add more items.",
    };
  }

  const giftVariants = payload.offers.flatMap((offer) =>
    offer.items.filter((item) => item.r === "gift").map((item) => item.v),
  );
  const unknown = giftLines.some(
    (line) =>
      giftVariants.length > 0 &&
      !giftVariants.some((id) => variantMatches(id, line)),
  );
  if (unknown) {
    return {
      ok: false as const,
      message: "This gift is not part of an active offer.",
    };
  }
  return { ok: true as const };
}

export { matchTier, allocateFixed, giftThresholdMet };
