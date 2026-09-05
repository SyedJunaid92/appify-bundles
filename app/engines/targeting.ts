import type { CompiledOffer } from "./offer";

export function normalizeGid(value: string, type: "Product" | "Collection" | "ProductVariant") {
  if (!value) return "";
  if (value.startsWith("gid://")) return value;
  return `gid://shopify/${type}/${value}`;
}

export function idsMatch(stored: string | null | undefined, target: string) {
  if (!stored) return false;
  if (stored === target) return true;
  const strip = (value: string) =>
    value.replace(/^gid:\/\/shopify\/(Product|Collection|ProductVariant)\//, "");
  return strip(stored) === strip(target);
}

export function anyIdMatch(list: unknown, target: string) {
  if (!Array.isArray(list)) return false;
  return list.some((id) => idsMatch(String(id), target));
}

export function parseScheduleDate(
  date: string | undefined,
  time: string | undefined,
) {
  if (!date) return null;
  const clock = time && /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  const parsed = new Date(`${date}T${clock}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isScheduleActive(
  settings: {
    startDate?: string;
    startTime?: string;
    hasEndDate?: boolean;
    endDate?: string;
    endTime?: string;
  } | undefined,
  now = new Date(),
) {
  if (!settings) return true;
  const start = parseScheduleDate(settings.startDate, settings.startTime);
  if (start && now < start) return false;
  if (settings.hasEndDate) {
    const end = parseScheduleDate(settings.endDate, settings.endTime || "23:59");
    if (end && now > end) return false;
  }
  return true;
}

export function isOfferInSchedule(
  startAt?: Date | string | null,
  endAt?: Date | string | null,
  now = new Date(),
) {
  if (startAt) {
    const start = startAt instanceof Date ? startAt : new Date(startAt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (endAt) {
    const end = endAt instanceof Date ? endAt : new Date(endAt);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

export type ProductMatchInput = {
  productId: string;
  collectionIds?: string[];
};

export function isProductInOfferScope(
  offer: Pick<CompiledOffer, "sc" | "p" | "c" | "xp" | "xc">,
  input: ProductMatchInput,
) {
  if (anyIdMatch(offer.xp, input.productId)) return false;
  if (
    offer.xc.length > 0 &&
    (input.collectionIds ?? []).some((id) => anyIdMatch(offer.xc, id))
  ) {
    return false;
  }

  if (offer.sc === "all") return true;

  if (offer.sc === "sel") {
    return anyIdMatch(offer.p, input.productId);
  }

  if (offer.sc === "col") {
    const collections = input.collectionIds ?? [];
    if (collections.length === 0) return false;
    return collections.some((id) => anyIdMatch(offer.c, id));
  }

  return false;
}

export function isB2bEligible(
  offer: Pick<CompiledOffer, "xb2b" | "b2b">,
  isB2b: boolean,
) {
  if (offer.xb2b && isB2b) return false;
  if (offer.b2b && !isB2b) return false;
  return true;
}
