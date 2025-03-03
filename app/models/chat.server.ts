// This would be replaced with a real database in production
let messages: ChatMessage[] = [];

export type ChatMessage = {
  id: string;
  userId: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  relatedTasks?: string[]; // Task IDs that this message references
};

export async function createMessage(
  userId: string,
  content: string,
  isUser: boolean,
  relatedTasks?: string[]
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: Math.random().toString(36).substring(2, 15),
    userId,
    content,
    isUser,
    timestamp: new Date(),
    relatedTasks,
  };
  
  messages.push(message);
  return message;
}

export async function getUserMessages(userId: string): Promise<ChatMessage[]> {
  return messages
    .filter(message => message.userId === userId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// Mock AI response function
export async function getAIResponse(
  userId: string,
  userMessage: string,
  userTasks: any[]
): Promise<ChatMessage> {
  // Simple keyword-based responses
  let response = "";
  
  if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
    response = "Hello! How can I help you with your portfolio or tasks today?";
  } else if (userMessage.toLowerCase().includes("portfolio")) {
    response = "Your portfolio is showing a total investment of $1,937.15 with a current return of -$45.35 (-2.34%).";
  } else if (userMessage.toLowerCase().includes("budget")) {
    response = "You've invested $1,430 this month, which meets your monthly budget. Your next deposit is expected on the 10th.";
  } else if (userMessage.toLowerCase().includes("task") || userMessage.toLowerCase().includes("todo")) {
    if (userTasks.length > 0) {
      response = `You have ${userTasks.length} tasks. The most recent one is "${userTasks[0].title}".`;
    } else {
      response = "You don't have any tasks yet. Would you like to create one?";
    }
  } else if (userMessage.toLowerCase().includes("schedule") || userMessage.toLowerCase().includes("calendar")) {
    response = "I can see your schedule for the upcoming days. Is there a specific date you're interested in?";
  } else {
    response = "I'm here to help with your portfolio management and tasks. What would you like to know?";
  }
  
  return createMessage(userId, response, false);
}
