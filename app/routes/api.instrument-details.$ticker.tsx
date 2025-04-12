// app/routes/api.instrument-details.$ticker.tsx
import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuthentication } from '~/services/auth.server'; // Adjust path if needed
import { getInstrumentDepthDetails } from '~/utils/portfolio/instruments'; // Adjust path if needed
import { InstrumentTickerParamSchema } from '~/utils/validation'; // Adjust path if needed
import { errorResponse, createValidationError, createNotFoundError } from '~/utils/error-handler'; // Adjust path if needed

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    // 1. Authenticate user (optional but recommended for protected data)
    const user = await requireAuthentication(request);

    // 2. Validate the ticker from the URL parameter
    const validationResult = InstrumentTickerParamSchema.safeParse(params);
    if (!validationResult.success) {
       const errors = validationResult.error.flatten().fieldErrors;
       console.warn("Instrument detail API validation failed:", errors);
       // Use createValidationError for structured error response
       return json(createValidationError("Invalid instrument symbol in URL.", errors), { status: 400 });
    }
    const { ticker } = validationResult.data;

    // 3. Fetch instrument details using the server-side function
    console.log(`[API Route] Fetching details for ticker: ${ticker}`);
    const instrument = await getInstrumentDepthDetails(ticker); // Call your server-only function

    // 4. Handle not found case
    if (!instrument) {
      // Use createNotFoundError for structured error response
       return json(createNotFoundError(`Instrument details for ${ticker}`), { status: 404 });
    }

    // 5. Return successful data (NO filtering here, return the full object)
    console.log(`[API Route] Successfully fetched details for ticker: ${ticker}`);
    // Log the fetched instrument data before returning
    console.log("[API Route] Returning instrument data:", JSON.stringify(instrument, null, 2));
    return json({ instrument: instrument }); // Return the full instrument object

  } catch (error) {
    // Handle errors from authentication or getInstrumentDepthDetails
    console.error(`[API Route Error] Ticker: ${params.ticker}`, error);
    return errorResponse(error); // Use centralized error handler
  }
};
