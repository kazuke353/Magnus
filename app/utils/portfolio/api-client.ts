import axios, { AxiosResponse } from 'axios';
import { ApiRequestOptions, CacheEntry } from './types';
import { getUserApiKey } from '~/db/apiKeys.server'; // Import the function to get API key

// API endpoints remain the same
export const API_ENDPOINTS = {
  PIES_LIST: "https://live.trading212.com/api/v0/equity/pies",
  INSTRUMENTS_METADATA: "https://live.trading212.com/api/v0/equity/metadata/instruments",
  CASH: "https://live.trading212.com/api/v0/equity/account/cash",
  getPieDetails: (pieId: string) => `https://live.trading212.com/api/v0/equity/pies/${pieId}`
};

// Default headers are now dynamic based on user
// export const DEFAULT_HEADERS = { ... }; // Remove static default headers

// In-memory cache for API responses (consider if user-specific caching is needed)
const apiCache = new Map<string, CacheEntry>();
const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Makes an API request with exponential backoff retry logic, using user-specific API key.
 * @param options Request options including URL, method, headers, userId.
 * @returns API response or null if request failed.
 */
export async function makeApiRequest(
  options: ApiRequestOptions & { userId: string } // Add userId to options
): Promise<AxiosResponse | null> {
  const { url, method = 'GET', headers: customHeaders, delay = 5, retries = 3, userId } = options;

  console.log(`[makeApiRequest] Making request for userId: ${userId}, url: ${url}`); // DEBUG LOG

  // 1. Fetch the user's Trading 212 API key
  const apiKey = await getUserApiKey(userId, 'trading212'); // Assuming service name is 'trading212'

  if (!apiKey) {
    // Log the error specifically here where it's determined the key is missing
    console.error(`[makeApiRequest] Trading 212 API key not found for user ${userId}. Cannot make request to ${url}.`); // DEBUG LOG
    // Optionally throw an error or return a specific error response
    // throw new Error(`API key for 'trading212' not configured for user.`);
    return null; // Or return a custom error structure if needed
  }

  console.log(`[makeApiRequest] Found Trading 212 API key for user ${userId}. Proceeding with request.`); // DEBUG LOG

  // 2. Construct dynamic headers with the user's key
  const dynamicHeaders = {
    "Authorization": apiKey,
    "Accept": "application/json",
    ...customHeaders // Allow overriding or adding custom headers
  };

  // 3. Caching (Consider if cache should be user-specific)
  // Simple cache key - might need refinement if headers affect response significantly
  const cacheKey = `${userId}:${method}:${url}`;
  const cachedResponse = apiCache.get(cacheKey);

  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_EXPIRATION_TIME) {
    console.log(`[makeApiRequest] Returning cached response for ${url} (User: ${userId})`); // DEBUG LOG
    return cachedResponse.data;
  }

  // 4. Retry Logic (remains the same, but uses dynamicHeaders)
  let attempts = 0;
  let currentDelay = delay;

  while (attempts <= retries) {
    try {
      console.log(`[makeApiRequest] Attempt ${attempts + 1}/${retries + 1} for ${url} (User: ${userId})`); // DEBUG LOG
      const response = await axios({
        method,
        url,
        headers: dynamicHeaders, // Use the dynamic headers
        timeout: 10000 // 10 second timeout
      });

      if (response.status >= 200 && response.status < 300) {
        apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
        console.log(`[makeApiRequest] Request successful for ${url} (User: ${userId}).`); // DEBUG LOG
        return response;
      } else {
        console.log(`[makeApiRequest] Request failed with status ${response.status} for ${url} (User: ${userId}), retrying in ${currentDelay} seconds...`); // DEBUG LOG
      }
    } catch (error: any) {
      console.error(`[makeApiRequest] Request error for ${url} (User: ${userId}): ${error.message}, retrying in ${currentDelay} seconds...`); // DEBUG LOG
      if (error.response) {
        console.error(`[makeApiRequest] Response details: status ${error.response.status}, data: ${JSON.stringify(error.response.data)}`); // DEBUG LOG
        // Handle specific auth errors (e.g., 401 Unauthorized)
        if (error.response.status === 401) {
           console.error(`[makeApiRequest] Authentication failed for user ${userId} with the provided Trading 212 key.`); // DEBUG LOG
           // Optionally clear the invalid key or notify the user
           // For now, just break the retry loop for auth errors
           break;
        }
      }
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, currentDelay * 1000));
    currentDelay *= 2; // Exponential backoff
  }

  console.error(`[makeApiRequest] Failed after ${retries} retries for ${url} (User: ${userId}).`); // DEBUG LOG
  return null;
}

/**
 * Clears the API cache.
 */
export function clearApiCache(): void {
  apiCache.clear();
  console.log("[clearApiCache] API cache cleared."); // DEBUG LOG
}
