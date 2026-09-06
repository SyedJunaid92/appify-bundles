export const THEME_APP_EMBED_HANDLE = "bundle-embed";

type ThemeSettingsBlock = {
  type?: unknown;
  disabled?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseThemeSettingsData(raw: string): unknown {
  const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (!cleaned) return null;
  return JSON.parse(cleaned);
}

export function themeSettingsBlocks(data: unknown): Record<string, ThemeSettingsBlock> {
  const root = asRecord(data);
  if (!root) return {};

  const current = root.current;
  if (asRecord(current)?.blocks) {
    return asRecord(asRecord(current)?.blocks) as Record<string, ThemeSettingsBlock>;
  }

  if (typeof current === "string") {
    const named =
      asRecord(root[current]) ?? asRecord(asRecord(root.presets)?.[current]);
    if (named?.blocks) {
      return asRecord(named.blocks) as Record<string, ThemeSettingsBlock>;
    }
  }

  return {};
}

function isAppifyEmbedType(type: string, embedHandle: string) {
  return (
    type.includes(`/blocks/${embedHandle}`) ||
    (type.includes("shopify://apps/") &&
      (type.includes("appify-bundles") || type.includes("bundle-embed")))
  );
}

function walkThemeBlocks(
  value: unknown,
  embedHandle: string,
): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => walkThemeBlocks(item, embedHandle));
  }

  const record = value as Record<string, unknown>;
  const type = String(record.type ?? "");
  if (isAppifyEmbedType(type, embedHandle) && record.disabled !== true) {
    return true;
  }

  return Object.values(record).some((child) =>
    walkThemeBlocks(child, embedHandle),
  );
}

export function isThemeAppEmbedEnabled(
  settingsData: string,
  embedHandle = THEME_APP_EMBED_HANDLE,
): boolean {
  try {
    const parsed = parseThemeSettingsData(settingsData);
    const blocks = themeSettingsBlocks(parsed);
    const fromCurrent = Object.values(blocks).some((block) => {
      const type = String(block?.type ?? "");
      return isAppifyEmbedType(type, embedHandle) && block.disabled !== true;
    });
    return fromCurrent || walkThemeBlocks(parsed, embedHandle);
  } catch {
    return false;
  }
}
