import axios, { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
import { ApiRequestOptions, CacheEntry } from './types';

dotenv.config();

// Environment variables & configuration
const api_key = process.env.API_KEY;
if (!api_key) {
  throw new Error('API_KEY environment variable is not set');
}

// API endpoints
export const API_ENDPOINTS = {
  PIES_LIST: "https://live.trading212.com/api/v0/equity/pies",
  INSTRUMENTS_METADATA: "https://live.trading212.com/api/v0/equity/metadata/instruments",
  CASH: "https://live.trading212.com/api/v0/equity/account/cash",
  getPieDetails: (pieId: string) => `https://live.trading212.com/api/v0/equity/pies/${pieId}`
};

// Default headers for API requests
export const DEFAULT_HEADERS = { 
  "Authorization": api_key, 
  "Accept": "application/json" 
};

// In-memory cache for API responses
const apiCache = new Map<string, CacheEntry>();
const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Makes an API request with exponential backoff retry logic
 * @param options Request options including URL, method, headers
 * @returns API response or null if request failed
 */
export async function makeApiRequest(
  options: ApiRequestOptions
): Promise<AxiosResponse | null> {
  const { url, method = 'GET', headers, delay = 5, retries = 3 } = options;
  const cacheKey = `${method}:${url}`;
  const cachedResponse = apiCache.get(cacheKey);

  // Return cached response if valid
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_EXPIRATION_TIME) {
    return cachedResponse.data;
  }

  let attempts = 0;
  let currentDelay = delay;
  
  while (attempts <= retries) {
    try {
      const response = await axios({
        method,
        url,
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      if (response.status >= 200 && response.status < 300) {
        apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
        console.log(`Request for ${url} successful.`);
        return response;
      } else {
        console.log(`Request for ${url} failed with status ${response.status}, retrying in ${currentDelay} seconds...`);
      }
    } catch (error: any) {
      console.error(`Request error for ${url}: ${error.message}, retrying in ${currentDelay} seconds...`);
      if (error.response) {
        console.error(`Response details: status ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, currentDelay * 1000));
    currentDelay *= 2; // Exponential backoff
  }
  
  console.error(`Failed after ${retries} retries for ${url}.`);
  return null;
}

/**
 * Clears the API cache
 */
export function clearApiCache(): void {
  apiCache.clear();
}
