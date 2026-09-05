import { describe, expect, it } from "vitest";
import {
  addCounters,
  clampRange,
  countersForEvent,
  conversionRate,
  dateKey,
  eachDateKey,
  parseDateKey,
  summarizeCounters,
  utcDayDate,
  widgetViews,
} from "../app/utils/daily-stats";
import { resolveAnalyticsRange } from "../app/utils/analytics-range";
import { parseAnalyticsFilters } from "../app/schemas/analytics.schema";
import { settleOrDefer } from "../app/services/webhook-defer.server";

describe("daily counters", () => {
  it("maps events onto the correct daily columns", () => {
    expect(countersForEvent("view")).toMatchObject({ views: 1, purchases: 0 });
    expect(countersForEvent("purchase", 12.5)).toMatchObject({
      purchases: 1,
      revenue: 12.5,
    });
    expect(countersForEvent("order")).toMatchObject({ orders: 1 });
  });

  it("summarizes shop-level rows the dashboard expects", () => {
    const summary = summarizeCounters([
      addCounters(countersForEvent("view"), countersForEvent("view")),
      countersForEvent("purchase", 40),
    ]);
    expect(summary.views).toBe(2);
    expect(summary.purchases).toBe(1);
    expect(summary.revenue).toBe(40);
    expect(summary.conversionRate).toBe(50);
  });

  it("treats impressions as widget views", () => {
    expect(widgetViews({ views: 3, impressions: 2 })).toBe(5);
    expect(conversionRate(0, 4)).toBe(0);
  });
});

describe("date helpers", () => {
  it("normalizes to a UTC date key", () => {
    expect(dateKey(new Date("2026-09-05T18:22:00Z"))).toBe("2026-09-05");
    expect(parseDateKey("2026-09-05").toISOString()).toBe(
      "2026-09-05T00:00:00.000Z",
    );
  });

  it("builds inclusive date ranges", () => {
    const keys = eachDateKey(parseDateKey("2026-09-01"), parseDateKey("2026-09-03"));
    expect(keys).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("clamps inverted and oversized ranges", () => {
    const flipped = clampRange(parseDateKey("2026-09-10"), parseDateKey("2026-09-01"));
    expect(dateKey(flipped.start)).toBe("2026-09-01");
    expect(dateKey(flipped.end)).toBe("2026-09-10");
  });
});

describe("analytics filters", () => {
  it("parses query filters", () => {
    const filters = parseAnalyticsFilters(
      new URLSearchParams("period=7d&bundleId=b1&status=active&eventType=purchase"),
    );
    expect(filters).toMatchObject({
      period: "7d",
      bundleId: "b1",
      status: "active",
      eventType: "purchase",
    });
  });

  it("resolves a custom date range", () => {
    const range = resolveAnalyticsRange({
      period: "custom",
      from: "2026-08-01",
      to: "2026-08-07",
      status: "all",
    });
    expect(dateKey(range.start)).toBe("2026-08-01");
    expect(dateKey(range.end)).toBe("2026-08-07");
  });

  it("falls back to 30 days when custom dates are missing", () => {
    const range = resolveAnalyticsRange({ period: "custom", status: "all" });
    const days =
      Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1;
    expect(days).toBe(30);
    expect(range.period).toBe("30d");
  });
});

describe("webhook defer", () => {
  it("returns done when work finishes inside the budget", async () => {
    const deferred: unknown[] = [];
    const result = await settleOrDefer(Promise.resolve("ok"), (pending) => {
      deferred.push(pending);
    }, 50);
    expect(result).toBe("done");
    expect(deferred).toHaveLength(0);
  });

  it("uses waitUntil-style defer when work exceeds the budget", async () => {
    const deferred: unknown[] = [];
    let finished = false;
    const slow = new Promise((resolve) => {
      setTimeout(() => {
        finished = true;
        resolve("late");
      }, 40);
    });

    const result = await settleOrDefer(slow, (pending) => {
      deferred.push(pending);
    }, 10);

    expect(result).toBe("deferred");
    expect(deferred).toHaveLength(1);
    await slow;
    expect(finished).toBe(true);
  });
});

describe("utcDayDate", () => {
  it("strips the time component", () => {
    const day = utcDayDate(new Date("2026-01-02T15:04:05.000Z"));
    expect(day.getUTCHours()).toBe(0);
    expect(day.getUTCDate()).toBe(2);
  });
});
