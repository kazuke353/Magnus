import { getDb } from './database.server';
import { ChatMessage, ChatSession } from './schema';
import { v4 as uuidv4 } from 'uuid';

export function createChatSession(userId: string, title: string): ChatSession {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    const insertStmt = db.prepare(
      'INSERT INTO chat_sessions (id, userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
    );
    insertStmt.run(id, userId, title, now, now);

    return {
      id,
      userId,
      title,
      createdAt: now,
      updatedAt: now
    };
  } catch (error) {
    console.error("createChatSession Error:", error);
    throw error;
  }
}

export function getChatSessions(userId: string): ChatSession[] {
  const db = getDb();
  try {
    const stmt = db.prepare(
      'SELECT * FROM chat_sessions WHERE userId = ? ORDER BY updatedAt DESC'
    );
    return stmt.all(userId) as ChatSession[];
  } catch (error) {
    console.error("getChatSessions Error:", error);
    return []; // Or throw error depending on error handling policy
  }
}

export function getChatSessionById(id: string): ChatSession | null {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
    const session = stmt.get(id) as ChatSession | undefined;
    return session || null;
  } catch (error) {
    console.error("getChatSessionById Error:", error);
    return null;
  }
}

export function addChatMessage(
  sessionId: string,
  userId: string,
  content: string,
  role: 'user' | 'assistant'
): ChatMessage {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    const insertStmt = db.prepare(
      'INSERT INTO chat_messages (id, userId, sessionId, content, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(id, userId, sessionId, content, role, now);

    // Update the session's updatedAt timestamp
    const updateSessionStmt = db.prepare(
      'UPDATE chat_sessions SET updatedAt = ? WHERE id = ?'
    );
    updateSessionStmt.run(now, sessionId);

    return {
      id,
      userId,
      sessionId,
      content,
      role,
      createdAt: now
    };
  } catch (error) {
    console.error("addChatMessage Error:", error);
    throw error;
  }
}

export function getChatMessages(sessionId: string): ChatMessage[] {
  const db = getDb();
  try {
    const stmt = db.prepare(
      'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC'
    );
    return stmt.all(sessionId) as ChatMessage[];
  } catch (error) {
    console.error("getChatMessages Error:", error);
    return []; // Or throw error depending on error handling policy
  }
}

export function deleteChatSession(id: string): void {
  const db = getDb();
  try {
    const deleteMessagesStmt = db.prepare('DELETE FROM chat_messages WHERE sessionId = ?');
    deleteMessagesStmt.run(id);
    const deleteSessionStmt = db.prepare('DELETE FROM chat_sessions WHERE id = ?');
    deleteSessionStmt.run(id);
  } catch (error) {
    console.error("deleteChatSession Error:", error);
    throw error; // Or handle error as needed
  }
}