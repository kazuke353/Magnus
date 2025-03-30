import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { requireAuthentication } from '~/services/auth.server'; // Use requireAuthentication
import { db } from '~/db/database.server';
import { portfolioAllocations } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { PieAllocation } from '~/utils/portfolio/types';

export const action: ActionFunction = async ({ request }) => {
  const user = await requireAuthentication(request, "/login");
  const userId = user.id;
  
  if (request.method === 'POST') {
    try {
      const formData = await request.json();
      
      if (!formData || !formData.pieName || formData.targetAllocation === undefined) {
        return json({ error: 'Invalid allocation data' }, { status: 400 });
      }
      
      const { pieName, targetAllocation } = formData;
      
      // Load existing allocations from database
      const existingAllocationsRecord = await db.select()
        .from(portfolioAllocations)
        .where(eq(portfolioAllocations.userId, userId));
      
      let existingAllocations: PieAllocation[] = [];
      if (existingAllocationsRecord.length > 0) {
        existingAllocations = JSON.parse(existingAllocationsRecord[0].data);
      }
      
      // Update or add the allocation
      const existingIndex = existingAllocations.findIndex(a => a.pieName === pieName);
      if (existingIndex >= 0) {
        existingAllocations[existingIndex].targetAllocation = targetAllocation;
      } else {
        existingAllocations.push({ pieName, targetAllocation });
      }
      
      // Save updated allocations to database
      if (existingAllocationsRecord.length > 0) {
        await db.update(portfolioAllocations)
          .set({
            data: JSON.stringify(existingAllocations),
            updatedAt: new Date()
          })
          .where(eq(portfolioAllocations.userId, userId));
      } else {
        await db.insert(portfolioAllocations).values({
          id: uuidv4(),
          userId,
          data: JSON.stringify(existingAllocations),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return json({ success: true, allocation: { pieName, targetAllocation } });
    } catch (error) {
      console.error('Error updating pie allocation:', error);
      return json({ error: 'Failed to update pie allocation' }, { status: 500 });
    }
  }
  
  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const loader = async ({ request }: { request: Request }) => {
  const user = await requireAuthentication(request, "/login");
  const userId = user.id;
  
  try {
    // Load allocations from database
    const allocationsRecord = await db.select()
      .from(portfolioAllocations)
      .where(eq(portfolioAllocations.userId, userId));
    
    let allocations: PieAllocation[] = [];
    if (allocationsRecord.length > 0) {
      allocations = JSON.parse(allocationsRecord[0].data);
    }
    
    return json({ allocations });
  } catch (error) {
    console.error('Error loading pie allocations:', error);
    return json({ error: 'Failed to load pie allocations' }, { status: 500 });
  }
};
