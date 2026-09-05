import { describe, expect, it } from "vitest";
import { resolveThemeForTest } from "../app/utils/theme";

describe("theme utilities", () => {
  describe("resolveThemeForTest", () => {
    it("returns light for light mode", () => {
      expect(resolveThemeForTest("light")).toBe("light");
    });

    it("returns dark for dark mode", () => {
      expect(resolveThemeForTest("dark")).toBe("dark");
    });

    it("returns system preference for system mode", () => {
      const result = resolveThemeForTest("system", "dark");
      expect(result).toBe("dark");
    });

    it("defaults system fallback to light", () => {
      const result = resolveThemeForTest("system", "light");
      expect(result).toBe("light");
    });
  });
});
