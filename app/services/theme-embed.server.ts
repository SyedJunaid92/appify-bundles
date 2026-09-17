import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { parseStoreThemes, type StoreTheme } from "../utils/theme-editor";
import { isThemeAppEmbedEnabled } from "../utils/theme-embed";

const MAIN_THEME_EMBED_QUERY = `#graphql
  query AppifyMainThemeEmbed {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        files(filenames: ["config/settings_data.json"]) {
          nodes {
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
              ... on OnlineStoreThemeFileBodyBase64 {
                contentBase64
              }
            }
          }
        }
      }
    }
  }
`;

const STORE_THEMES_QUERY = `#graphql
  query AppifyStoreThemes {
    themes(first: 50, roles: [MAIN, UNPUBLISHED, DEVELOPMENT, DEMO]) {
      nodes {
        id
        name
        role
        files(filenames: ["templates/product.json"], first: 1) {
          nodes {
            filename
          }
        }
      }
    }
  }
`;

type ThemeFileBody = { content?: string | null; contentBase64?: string | null };
type ThemeFiles = { nodes?: Array<{ body?: ThemeFileBody | null }> };
type ThemesPayload = {
  data?: {
    themes?: {
      nodes?: Array<{ files?: ThemeFiles | null }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

type StoreThemesPayload = {
  data?: {
    themes?: {
      nodes?: Array<{
        id?: string | null;
        name?: string | null;
        role?: string | null;
        files?: { nodes?: Array<{ filename?: string | null }> | null } | null;
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

export async function isAppEmbedActiveOnMainTheme(
  admin: Pick<AdminApiContext, "graphql">,
): Promise<boolean> {
  return loadAppEmbedActive(admin);
}

export async function listStoreThemes(
  admin: Pick<AdminApiContext, "graphql">,
): Promise<StoreTheme[]> {
  try {
    const response = await admin.graphql(STORE_THEMES_QUERY);
    const payload = (await response.json()) as StoreThemesPayload;
    if (payload.errors?.length) {
      console.error(
        "[theme-embed] list themes graphql errors",
        payload.errors.map((error) => error.message).join("; "),
      );
      return [];
    }
    return parseStoreThemes(payload.data?.themes?.nodes ?? []);
  } catch (error) {
    console.error("[theme-embed] failed to list themes", error);
    return [];
  }
}

async function loadAppEmbedActive(
  admin: Pick<AdminApiContext, "graphql">,
): Promise<boolean> {
  try {
    const response = await admin.graphql(MAIN_THEME_EMBED_QUERY);
    const payload = (await response.json()) as ThemesPayload;
    if (payload.errors?.length) {
      console.error(
        "[theme-embed] graphql errors",
        payload.errors.map((error) => error.message).join("; "),
      );
      return false;
    }
    const body = payload.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body;
    const content =
      body?.content ||
      (body?.contentBase64
        ? Buffer.from(body.contentBase64, "base64").toString("utf8")
        : "");
    if (!content) return false;
    return isThemeAppEmbedEnabled(content);
  } catch (error) {
    console.error("[theme-embed] failed to read published theme", error);
    return false;
  }
}
