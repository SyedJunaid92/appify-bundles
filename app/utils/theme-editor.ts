import { THEME_APP_EMBED_HANDLE } from "./theme-embed";

export const THEME_APP_BLOCK_HANDLE = "bundle-widget";

export type StoreTheme = {
  id: string;
  name: string;
  role: string;
  isOs2: boolean;
};

type ThemeFileNode = { filename?: string | null };
type ThemeNode = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  files?: { nodes?: ThemeFileNode[] | null } | null;
};

export function shopAdminHost(shop: string) {
  return shop.replace(/^https?:\/\//, "");
}

export function numericThemeId(gidOrId: string) {
  const value = gidOrId.trim();
  if (!value) return "current";
  return value.includes("/") ? value.split("/").pop() || "current" : value;
}

export function isOs2ThemeFromFiles(filenames: Array<string | null | undefined>) {
  return filenames.some(
    (filename) =>
      filename === "templates/product.json" ||
      filename?.endsWith("/templates/product.json"),
  );
}

export function parseStoreThemes(nodes: ThemeNode[]): StoreTheme[] {
  const themes = nodes.flatMap((node) => {
    if (!node.id || !node.name) return [];
    const filenames = (node.files?.nodes ?? []).map((file) => file.filename);
    return [
      {
        id: numericThemeId(node.id),
        name: node.name,
        role: node.role || "UNPUBLISHED",
        isOs2: isOs2ThemeFromFiles(filenames),
      },
    ];
  });

  return themes.sort((a, b) => {
    if (a.role === "MAIN") return -1;
    if (b.role === "MAIN") return 1;
    return a.name.localeCompare(b.name);
  });
}

export function themeRoleLabel(role: string) {
  if (role === "MAIN") return "Live";
  if (role === "DEVELOPMENT") return "Development";
  if (role === "DEMO") return "Trial";
  return "Draft";
}

function themeEditorPath(shop: string, themeId?: string) {
  const id = themeId ? numericThemeId(themeId) : "current";
  return `https://${shopAdminHost(shop)}/admin/themes/${id}/editor`;
}

export function getThemeEditorEmbedUrl(
  shop: string,
  apiKey: string,
  themeId?: string,
) {
  return `${themeEditorPath(shop, themeId)}?context=apps&template=product&activateAppId=${apiKey}/${THEME_APP_EMBED_HANDLE}`;
}

export function getThemeEditorAppBlockUrl(
  shop: string,
  apiKey: string,
  themeId?: string,
) {
  return `${themeEditorPath(shop, themeId)}?template=product&addAppBlockId=${apiKey}/${THEME_APP_BLOCK_HANDLE}&target=newAppsSection`;
}
