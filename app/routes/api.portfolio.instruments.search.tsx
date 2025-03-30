import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { requireAuthentication } from '~/services/auth.server'; // Use requireAuthentication
import { searchInstruments } from '~/utils/portfolio/instruments';

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireAuthentication(request, "/login");
  const userId = user.id;
  
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const limit = url.searchParams.get('limit');
    
    if (!query) {
      return json({ results: [] });
    }
    
    const limitValue = limit ? parseInt(limit, 10) : 10;
    const results = await searchInstruments(query, limitValue);
    
    return json({ results });
  } catch (error) {
    console.error('Error searching instruments:', error);
    return json({ error: 'Failed to search instruments' }, { status: 500 });
  }
};
