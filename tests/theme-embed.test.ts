import { describe, expect, it } from "vitest";
import { isThemeAppEmbedEnabled } from "../app/utils/theme-embed";

const EMBED_TYPE =
  "shopify://apps/appify-bundles/blocks/bundle-embed/8738ae3d-25c4-f928-2ab3-1488c50a48290045fd0b";

describe("theme app embed detection", () => {
  it("treats a live embed as enabled", () => {
    const settings = JSON.stringify({
      current: {
        blocks: {
          "abc123": { type: EMBED_TYPE, disabled: false },
        },
      },
    });
    expect(isThemeAppEmbedEnabled(settings)).toBe(true);
  });

  it("treats a disabled or missing embed as off", () => {
    expect(
      isThemeAppEmbedEnabled(
        JSON.stringify({
          current: {
            blocks: {
              "abc123": { type: EMBED_TYPE, disabled: true },
            },
          },
        }),
      ),
    ).toBe(false);
    expect(isThemeAppEmbedEnabled(JSON.stringify({ current: { blocks: {} } }))).toBe(
      false,
    );
  });

  it("reads named presets and ignores theme comments", () => {
    const settings = `/* auto-generated */
{
  "current": "Default",
  "presets": {
    "Default": {
      "blocks": {
        "embed": { "type": "${EMBED_TYPE}" }
      }
    }
  }
}`;
    expect(isThemeAppEmbedEnabled(settings)).toBe(true);
  });
});
