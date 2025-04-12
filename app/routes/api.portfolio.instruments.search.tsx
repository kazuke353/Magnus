import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node'; // Use LoaderFunctionArgs
import { requireAuthentication } from '~/services/auth.server';
import { searchInstruments } from '~/utils/portfolio/instruments';
import { InstrumentSearchQuerySchema } from '~/utils/validation'; // Import schema
import { errorResponse, createValidationError } from '~/utils/error-handler'; // Import error utils

export const loader = async ({ request }: LoaderFunctionArgs) => { // Use LoaderFunctionArgs
  try {
    const user = await requireAuthentication(request);
    // userId is available if needed for user-specific search logic later
    // const userId = user.id;

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Validate query parameters
    const validationResult = InstrumentSearchQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.warn("Instrument search validation failed:", errors);
      // Return a structured validation error
      return json(createValidationError("Invalid search parameters", errors), { status: 400 });
    }

    const { query, limit } = validationResult.data;

    // Perform search using validated data
    const results = await searchInstruments(query, limit);

    // Return only necessary fields
    const filteredResults = results.map(r => ({
        symbol: r.symbol,
        name: r.name,
        exchange: r.exchange,
        type: r.type
    }));

    return json({ results: filteredResults });

  } catch (error) {
    // Handle potential errors from requireAuthentication or searchInstruments
    return errorResponse(error); // Use centralized error handler
  }
};
