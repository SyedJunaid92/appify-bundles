import type { AnalyticsEventType } from "../schemas/analytics.schema";

export const MAX_ANALYTICS_RANGE_DAYS = 366;

export interface DailyCounters {
  views: number;
  impressions: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  revenue: number;
  orders: number;
}

export const EMPTY_DAILY_COUNTERS: DailyCounters = {
  views: 0,
  impressions: 0,
  clicks: 0,
  addToCart: 0,
  purchases: 0,
  revenue: 0,
  orders: 0,
};

export function utcDayDate(input = new Date()): Date {
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
  );
}

export function dateKey(input: Date): string {
  return utcDayDate(input).toISOString().slice(0, 10);
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

export function countersForEvent(
  eventType: AnalyticsEventType | "order",
  revenue = 0,
): DailyCounters {
  const next = { ...EMPTY_DAILY_COUNTERS };

  switch (eventType) {
    case "view":
      next.views = 1;
      break;
    case "impression":
      next.impressions = 1;
      break;
    case "click":
      next.clicks = 1;
      break;
    case "add_to_cart":
      next.addToCart = 1;
      break;
    case "purchase":
      next.purchases = 1;
      next.revenue = roundMoney(revenue);
      break;
    case "order":
      next.orders = 1;
      break;
  }

  return next;
}

export function addCounters(target: DailyCounters, extra: DailyCounters): DailyCounters {
  return {
    views: target.views + extra.views,
    impressions: target.impressions + extra.impressions,
    clicks: target.clicks + extra.clicks,
    addToCart: target.addToCart + extra.addToCart,
    purchases: target.purchases + extra.purchases,
    revenue: roundMoney(target.revenue + extra.revenue),
    orders: target.orders + extra.orders,
  };
}

export function widgetViews(counters: Pick<DailyCounters, "views" | "impressions">): number {
  return counters.views + counters.impressions;
}

export function conversionRate(views: number, purchases: number): number {
  return views > 0 ? Math.round((purchases / views) * 10000) / 100 : 0;
}

export function cartRate(views: number, addToCart: number): number {
  return views > 0 ? Math.round((addToCart / views) * 10000) / 100 : 0;
}

export function summarizeCounters(rows: DailyCounters[]) {
  const totals = rows.reduce(addCounters, { ...EMPTY_DAILY_COUNTERS });
  const views = widgetViews(totals);
  return {
    views,
    addToCart: totals.addToCart,
    purchases: totals.purchases,
    revenue: totals.revenue,
    orders: totals.orders,
    clicks: totals.clicks,
    impressions: totals.impressions,
    conversionRate: conversionRate(views, totals.purchases),
    cartRate: cartRate(views, totals.addToCart),
  };
}

export function eachDateKey(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = utcDayDate(start);
  const last = utcDayDate(end);
  while (cursor.getTime() <= last.getTime()) {
    keys.push(dateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export function clampRange(start: Date, end: Date): { start: Date; end: Date } {
  let from = utcDayDate(start);
  let to = utcDayDate(end);
  if (to.getTime() < from.getTime()) {
    const swap = from;
    from = to;
    to = swap;
  }
  const maxSpan = MAX_ANALYTICS_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxSpan) {
    from = new Date(to.getTime() - maxSpan);
  }
  return { start: from, end: to };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
