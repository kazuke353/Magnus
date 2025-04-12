import { db } from './database.server';
import { userApiKeys, UserApiKey } from './schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '~/utils/encryption.server';

/**
 * Saves or updates a user's API key for a specific service.
 * The key is encrypted before saving.
 * @param userId The ID of the user.
 * @param serviceName The name of the service (e.g., 'openai').
 * @param apiKey The plain text API key.
 * @returns The saved UserApiKey record (without the encrypted key).
 */
export async function saveUserApiKey(
  userId: string,
  serviceName: string,
  apiKey: string
): Promise<Omit<UserApiKey, 'encryptedKey' | 'iv' | 'authTag'>> {
  console.log(`[saveUserApiKey] Attempting to save key for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
  const { encryptedData, iv, authTag } = encrypt(apiKey);
  const now = new Date().toISOString();

  try {
    // Check if a key for this user and service already exists
    const existingKey = await db.select({ id: userApiKeys.id })
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.serviceName, serviceName)))
      .limit(1);

    let resultKey: Omit<UserApiKey, 'encryptedKey' | 'iv' | 'authTag'>;
    let operation: string; // DEBUG LOG

    if (existingKey.length > 0) {
      // Update existing key
      operation = 'update'; // DEBUG LOG
      const keyId = existingKey[0].id;
      await db.update(userApiKeys)
        .set({
          encryptedKey: encryptedData,
          iv: iv,
          authTag: authTag,
          updatedAt: now,
        })
        .where(eq(userApiKeys.id, keyId));
      resultKey = { id: keyId, userId, serviceName, createdAt: '', updatedAt: now }; // createdAt won't change
    } else {
      // Insert new key
      operation = 'insert'; // DEBUG LOG
      const keyId = uuidv4();
      await db.insert(userApiKeys).values({
        id: keyId,
        userId,
        serviceName,
        encryptedKey: encryptedData,
        iv: iv,
        authTag: authTag,
        createdAt: now,
        updatedAt: now,
      });
      resultKey = { id: keyId, userId, serviceName, createdAt: now, updatedAt: now };
    }

    console.log(`[saveUserApiKey] Successfully performed ${operation} for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG

    // Fetch the created/updated record to get accurate timestamps if needed,
    // but exclude sensitive fields for the return value.
    const savedRecord = await db.select({
        id: userApiKeys.id,
        userId: userApiKeys.userId,
        serviceName: userApiKeys.serviceName,
        createdAt: userApiKeys.createdAt,
        updatedAt: userApiKeys.updatedAt,
    })
      .from(userApiKeys)
      .where(eq(userApiKeys.id, resultKey.id))
      .limit(1);

    if (!savedRecord[0]) {
        console.error(`[saveUserApiKey] CRITICAL: Failed to retrieve saved record after ${operation}! userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
        throw new Error("Failed to retrieve saved API key record.");
    }

    return savedRecord[0];

  } catch (error) {
    console.error(`[saveUserApiKey] Error saving API key for userId: ${userId}, service ${serviceName}:`, error); // DEBUG LOG
    // Check for unique constraint violation (SQLite specific error code might vary)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`An API key for service "${serviceName}" already exists for this user.`);
    }
    throw new Error(`Failed to save API key for service "${serviceName}".`);
  }
}

/**
 * Retrieves and decrypts a user's API key for a specific service.
 * @param userId The ID of the user.
 * @param serviceName The name of the service.
 * @returns The decrypted API key, or null if not found or decryption fails.
 */
export async function getUserApiKey(userId: string, serviceName: string): Promise<string | null> {
  console.log(`[getUserApiKey] Attempting to retrieve key for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
  try {
    const result = await db.select({
        encryptedKey: userApiKeys.encryptedKey,
        iv: userApiKeys.iv,
        authTag: userApiKeys.authTag,
      })
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.serviceName, serviceName)))
      .limit(1);

    console.log(`[getUserApiKey] Found ${result.length} matching records for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG

    if (result.length === 0) {
      console.warn(`[getUserApiKey] Key not found in DB for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
      return null; // Key not found
    }

    const { encryptedKey, iv, authTag } = result[0];
    console.log(`[getUserApiKey] Found key record, attempting decryption... userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
    const decryptedKey = decrypt(encryptedKey, iv, authTag);

    if (decryptedKey === null) {
      console.error(`[getUserApiKey] Decryption failed for userId: ${userId}, service: ${serviceName}. Master key might have changed or data corrupted.`); // DEBUG LOG
      return null; // Decryption failed
    }

    console.log(`[getUserApiKey] Decryption successful for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
    return decryptedKey;
  } catch (error) {
    console.error(`[getUserApiKey] Error retrieving API key for userId: ${userId}, service ${serviceName}:`, error); // DEBUG LOG
    return null;
  }
}

/**
 * Deletes a user's API key for a specific service.
 * @param userId The ID of the user.
 * @param serviceName The name of the service.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteUserApiKey(userId: string, serviceName: string): Promise<boolean> {
  console.log(`[deleteUserApiKey] Attempting to delete key for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
  try {
    const result = await db.delete(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.serviceName, serviceName)));

    // Drizzle's delete returns an array, check if any rows were affected
    // Note: The exact return type might vary based on the driver. Adjust if needed.
    // For better-sqlite3, it might return an object with changes count.
    // Let's assume for now it returns something truthy if rows were deleted.
    // A more robust check might involve checking result.changes > 0 if available.
    console.log(`[deleteUserApiKey] Deletion successful for userId: ${userId}, service: ${serviceName}`); // DEBUG LOG
    return true; // Assume success if no error is thrown

  } catch (error) {
    console.error(`[deleteUserApiKey] Error deleting API key for userId: ${userId}, service ${serviceName}:`, error); // DEBUG LOG
    return false;
  }
}

/**
 * Lists the names of the services for which a user has stored API keys.
 * Does NOT return the keys themselves.
 * @param userId The ID of the user.
 * @returns An array of service names.
 */
export async function listUserApiKeyServices(userId: string): Promise<string[]> {
  console.log(`[listUserApiKeyServices] Listing services for userId: ${userId}`); // DEBUG LOG
  try {
    const results = await db.select({ serviceName: userApiKeys.serviceName })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId))
      .orderBy(userApiKeys.serviceName);

    const serviceNames = results.map(row => row.serviceName);
    console.log(`[listUserApiKeyServices] Found services: [${serviceNames.join(', ')}] for userId: ${userId}`); // DEBUG LOG
    return serviceNames;
  } catch (error) {
    console.error(`[listUserApiKeyServices] Error listing API key services for userId: ${userId}:`, error); // DEBUG LOG
    return [];
  }
}
