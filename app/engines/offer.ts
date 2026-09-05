export type OfferPriceType = "p" | "f" | "l" | "r" | "full";

export type CompiledOfferType =
  | "quantity_break"
  | "bogo"
  | "mix_match"
  | "fixed_bundle"
  | "fbt_upsell"
  | "gifts";

export interface CompiledTier {
  q: number;
  t: OfferPriceType;
  v: number;
  fp?: number | null;
  k?: string;
}

export interface CompiledItem {
  v: string;
  p?: string;
  r: string;
  t?: OfferPriceType;
  d?: number;
}

export interface CompiledOffer {
  id: string;
  type: CompiledOfferType;
  name: string;
  wo: boolean;
  xb2b: boolean;
  b2b: boolean;
  sc: "all" | "sel" | "col";
  p: string[];
  c: string[];
  xp: string[];
  xc: string[];
  tiers: CompiledTier[];
  items: CompiledItem[];
  bogo?: { b: number; g: number; t: "p" | "r"; v: number; max: number };
  fbt?: { mode: "addons" | "combo"; min: number };
  gift?: { by: "$" | "q"; min: number; ship: boolean };
}

export interface CompiledOffersPayload {
  offers: CompiledOffer[];
}

export const MAX_ACTIVE_OFFERS = 40;
export const MAX_TIERS_PER_OFFER = 8;
export const MAX_ITEMS_PER_OFFER = 24;
