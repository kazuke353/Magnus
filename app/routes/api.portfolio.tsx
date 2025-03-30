// app/routes/api.portfolio.tsx
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getPortfolioData, savePortfolioData } from "~/services/portfolio.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import { errorResponse, createApiError } from "~/utils/error-handler";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Authenticate the user for this API endpoint
    const user = await requireAuthentication(request);
    if (!user) {
      return json({ error: "Authentication required" }, { status: 401 });
    }

    // --- Check for refresh parameter ---
    const url = new URL(request.url);
    const shouldForceRefresh = url.searchParams.get("refresh") === "true";
    // --- End Check ---

    let portfolioData: PerformanceMetrics | null = null;
    let cacheUsed = false; // Flag to track cache usage

    // Get portfolio data (conditionally checking cache)
    if (!shouldForceRefresh) {
      // Try cache only if not forcing refresh
      const cachedData = await getPortfolioData(user.id);
      if (cachedData) {
        portfolioData = cachedData;
        cacheUsed = true;
      }
    }

    // If no cached data was used (either cache miss or forced refresh)
    if (!cacheUsed) {
      // Fetch fresh data
      // Note: Ensure getPortfolioData can be called with settings if needed.
      portfolioData = await getPortfolioData(user.settings.monthlyBudget, user.settings.country); // Assuming getPortfolioData handles fetching logic

      if (portfolioData) {
         await savePortfolioData(user.id, portfolioData);
      } else {
          if (shouldForceRefresh) {
              return json({ portfolioData: null, error: "Failed to fetch fresh data on refresh." }, { status: 500 });
          }
      }
    }


    if (!portfolioData) {
       return json({ portfolioData: null });
    }

    const headers = shouldForceRefresh
        ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        : { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=60' };

    return json({ portfolioData }, { headers });

  } catch (error) {
    console.error("Error loading portfolio data in API route:", error);
    const apiError = createApiError(error, 500);
    return json({ portfolioData: null, error: apiError.message, details: apiError.details }, { status: apiError.status });
  }
};

// Optional: Action function if you need to trigger updates via POST/PUT etc.
// export const action = async ({ request }: ActionFunctionArgs) => { ... };