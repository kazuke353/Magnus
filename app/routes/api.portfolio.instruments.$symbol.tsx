import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { requireUserId } from '~/services/auth.server';
import { getInstrumentDetails } from '~/utils/portfolio/instruments';

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const { symbol } = params;
  
  if (!symbol) {
    return json({ error: 'Symbol is required' }, { status: 400 });
  }
  
  try {
    const instrument = await getInstrumentDetails(symbol);
    
    if (!instrument) {
      return json({ error: 'Instrument not found' }, { status: 404 });
    }
    
    return json({ instrument });
  } catch (error) {
    console.error(`Error fetching instrument details for ${symbol}:`, error);
    return json({ error: 'Failed to fetch instrument details' }, { status: 500 });
  }
};
