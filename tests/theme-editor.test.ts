import { describe, expect, it } from "vitest";
import {
  getThemeEditorAppBlockUrl,
  getThemeEditorEmbedUrl,
  isOs2ThemeFromFiles,
  numericThemeId,
  parseStoreThemes,
  themeRoleLabel,
} from "../app/utils/theme-editor";

describe("theme editor onboarding helpers", () => {
  it("extracts numeric theme ids from GIDs", () => {
    expect(numericThemeId("gid://shopify/OnlineStoreTheme/12345")).toBe("12345");
    expect(numericThemeId("12345")).toBe("12345");
  });

  it("detects Online Store 2.0 from product.json", () => {
    expect(isOs2ThemeFromFiles(["templates/product.json"])).toBe(true);
    expect(isOs2ThemeFromFiles(["templates/product.liquid"])).toBe(false);
  });

  it("parses store themes with live theme first", () => {
    const themes = parseStoreThemes([
      {
        id: "gid://shopify/OnlineStoreTheme/2",
        name: "Draft Dawn",
        role: "UNPUBLISHED",
        files: { nodes: [{ filename: "templates/product.json" }] },
      },
      {
        id: "gid://shopify/OnlineStoreTheme/1",
        name: "Vintage live",
        role: "MAIN",
        files: { nodes: [] },
      },
    ]);
    expect(themes[0]).toMatchObject({
      id: "1",
      name: "Vintage live",
      role: "MAIN",
      isOs2: false,
    });
    expect(themes[1].isOs2).toBe(true);
  });

  it("builds embed and app block deep links", () => {
    expect(getThemeEditorEmbedUrl("demo.myshopify.com", "abc")).toBe(
      "https://demo.myshopify.com/admin/themes/current/editor?context=apps&template=product&activateAppId=abc/bundle-embed",
    );
    expect(getThemeEditorEmbedUrl("demo.myshopify.com", "abc", "99")).toBe(
      "https://demo.myshopify.com/admin/themes/99/editor?context=apps&template=product&activateAppId=abc/bundle-embed",
    );
    expect(getThemeEditorAppBlockUrl("demo.myshopify.com", "abc", "99")).toBe(
      "https://demo.myshopify.com/admin/themes/99/editor?template=product&addAppBlockId=abc/bundle-widget&target=newAppsSection",
    );
  });

  it("labels theme roles", () => {
    expect(themeRoleLabel("MAIN")).toBe("Live");
    expect(themeRoleLabel("UNPUBLISHED")).toBe("Draft");
  });
});
