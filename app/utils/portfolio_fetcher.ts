// This file is deprecated and should not be used.
// All functionality has been moved to the modular portfolio utilities in utils/portfolio/
// Import from utils/portfolio/index.ts instead

import { fetchPortfolioData as fetchPortfolioDataFromModules } from './portfolio/index';

// Re-export the function for backward compatibility
export const fetchPortfolioData = fetchPortfolioDataFromModules;

// Log a deprecation warning
console.warn('Warning: utils/portfolio_fetcher.ts is deprecated. Use utils/portfolio/index.ts instead.');
