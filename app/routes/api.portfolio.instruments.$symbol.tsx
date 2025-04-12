import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node'; // Use LoaderFunctionArgs
import { requireAuthentication } from '~/services/auth.server';
import { getInstrumentDetails } from '~/utils/portfolio/instruments';
import { InstrumentSymbolParamSchema } from '~/utils/validation'; // Import schema
import { errorResponse, createValidationError } from '~/utils/error-handler'; // Import error utils

export const loader = async ({ request, params }: LoaderFunctionArgs) => { // Use LoaderFunctionArgs
  try {
    const user = await requireAuthentication(request);
    // userId is available if needed later
    // const userId = user.id;

    // Validate URL parameter
    const validationResult = InstrumentSymbolParamSchema.safeParse(params);
    if (!validationResult.success) {
       const errors = validationResult.error.flatten().fieldErrors;
       console.warn("Instrument detail validation failed:", errors);
       return json(createValidationError("Invalid instrument symbol in URL.", errors), { status: 400 });
    }

    const { symbol } = validationResult.data;

    const instrument = await getInstrumentDetails(symbol);

    if (!instrument) {
      return json({ error: 'Instrument not found' }, { status: 404 });
    }

    // Return only necessary fields (Data Exposure Review)
    const filteredInstrument = {
        ticker: instrument.ticker,
        name: instrument.name,
        currencyCode: instrument.currencyCode,
        type: instrument.type,
        exchange: instrument.exchange,
        sector: instrument.sector,
        industry: instrument.industry,
        marketCap: instrument.marketCap,
        currentPrice: instrument.currentPrice,
        dividendYield: instrument.dividendYield,
        peRatio: instrument.peRatio,
        beta: instrument.beta,
        fiftyTwoWeekHigh: instrument.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: instrument.fiftyTwoWeekLow,
        // Omit fields like addedOn, maxOpenQuantity, minTradeQuantity unless needed by client
    };

    return json({ instrument: filteredInstrument });

  } catch (error) {
    // Handle potential errors from requireAuthentication or getInstrumentDetails
    return errorResponse(error); // Use centralized error handler
  }
};
