import { json, ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'; // Import correct types
import type { ActionFunction, LoaderFunction, TypedResponse } from '@remix-run/node';
import { requireAuthentication } from '~/services/auth.server';
import { db } from '~/db/database.server';
import { portfolioAllocations } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { PieAllocation } from '~/utils/portfolio/types';
import { PieAllocationUpdateSchema } from '~/utils/validation'; // Import schema
import { errorResponse, createValidationError, handleError } from '~/utils/error-handler'; // Import error utils

// Define expected types for loader data
interface AllocationLoaderData {
  allocations: PieAllocation[];
  error?: { message: string; details?: any };
}

// Define expected types for action data
interface AllocationActionData {
  success: boolean;
  allocation?: PieAllocation;
  error?: string;
  details?: any;
}

export const action: ActionFunction = async ({ request }: ActionFunctionArgs): Promise<TypedResponse<AllocationActionData>> => {
  try {
    const user = await requireAuthentication(request);
    const userId = user.id;

    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const payload = await request.json();

    // Validate payload
    const validationResult = PieAllocationUpdateSchema.safeParse(payload);
    if (!validationResult.success) {
      return json(createValidationError("Invalid allocation data.", validationResult.error.flatten().fieldErrors), { status: 400 });
    }

    const { pieName, targetAllocation } = validationResult.data;

    // Load existing allocations from database
    const existingAllocationsRecord = await db.select()
      .from(portfolioAllocations)
      .where(eq(portfolioAllocations.userId, userId));

    let existingAllocations: PieAllocation[] = [];
    if (existingAllocationsRecord.length > 0) {
      try {
        existingAllocations = JSON.parse(existingAllocationsRecord[0].data);
        if (!Array.isArray(existingAllocations)) existingAllocations = []; // Handle invalid JSON
      } catch (parseError) {
        console.error("Error parsing existing allocations:", parseError);
        existingAllocations = []; // Start fresh if parsing fails
      }
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
    return errorResponse(error); // Use centralized error handler
  }
};

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs): Promise<TypedResponse<AllocationLoaderData>> => {
  try {
    const user = await requireAuthentication(request);
    const userId = user.id;

    // Load allocations from database
    const allocationsRecord = await db.select()
      .from(portfolioAllocations)
      .where(eq(portfolioAllocations.userId, userId));

    let allocations: PieAllocation[] = [];
    if (allocationsRecord.length > 0) {
       try {
         allocations = JSON.parse(allocationsRecord[0].data);
         if (!Array.isArray(allocations)) allocations = []; // Handle invalid JSON
       } catch (parseError) {
         console.error("Error parsing allocations in loader:", parseError);
         allocations = [];
       }
    }

    return json({ allocations });
  } catch (error) {
     if (error instanceof Response) { throw error; }
     console.error('API Allocation Loader Error:', error);
     const apiError = handleError(error);
     return json(
         { allocations: [], error: { message: apiError.message, details: apiError.details } },
         { status: apiError.status }
     );
  }
};
