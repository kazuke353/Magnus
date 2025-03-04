import { getDb } from './database.server';
import { ChatMessage, ChatSession } from './schema';
import { v4 as uuidv4 } from 'uuid';

export async function createChatSession(userId: string, title: string): Promise<ChatSession> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  await db.run(
    'INSERT INTO chat_sessions (id, userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    [id, userId, title, now, now]
  );

  return {
    id,
    userId,
    title,
    createdAt: now,
    updatedAt: now
  };
}

export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  const db = await getDb();
  return db.all(
    'SELECT * FROM chat_sessions WHERE userId = ? ORDER BY updatedAt DESC',
    userId
  );
}

export async function getChatSessionById(id: string): Promise<ChatSession | null> {
  const db = await getDb();
  return db.get('SELECT * FROM chat_sessions WHERE id = ?', id);
}

export async function addChatMessage(
  sessionId: string,
  userId: string,
  content: string,
  role: 'user' | 'assistant'
): Promise<ChatMessage> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  await db.run(
    'INSERT INTO chat_messages (id, userId, sessionId, content, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, sessionId, content, role, now]
  );

  // Update the session's updatedAt timestamp
  await db.run(
    'UPDATE chat_sessions SET updatedAt = ? WHERE id = ?',
    [now, sessionId]
  );

  return {
    id,
    userId,
    content,
    role,
    createdAt: now
  };
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  return db.all(
    'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC',
    sessionId
  );
}

export async function deleteChatSession(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM chat_messages WHERE sessionId = ?', id);
  await db.run('DELETE FROM chat_sessions WHERE id = ?', id);
}
