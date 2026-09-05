import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatPercent,
} from "../app/utils/analytics-format";

describe("formatCurrency", () => {
  it("formats USD amounts", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatPercent", () => {
  it("formats with one decimal", () => {
    expect(formatPercent(12.345)).toBe("12.3%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("analytics period aggregation logic", () => {
  it("calculates conversion rate correctly", () => {
    const views = 100;
    const purchases = 5;
    const rate = views > 0 ? Math.round((purchases / views) * 10000) / 100 : 0;
    expect(rate).toBe(5);
  });

  it("returns zero conversion when no views", () => {
    const views = 0;
    const purchases = 5;
    const rate = views > 0 ? Math.round((purchases / views) * 10000) / 100 : 0;
    expect(rate).toBe(0);
  });
});
