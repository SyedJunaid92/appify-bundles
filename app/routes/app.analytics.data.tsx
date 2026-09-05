import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { parseAnalyticsFilters } from "../schemas/analytics.schema";
import { getAnalyticsDashboard } from "../services/analytics.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const filters = parseAnalyticsFilters(url.searchParams);
  return getAnalyticsDashboard(session.shop, filters);
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
