import { OpenAI } from "openai";
import { Task } from "~/db/schema";
import { getTasksByDateRange } from "~/db/tasks.server";

// In a real app, use environment variables for the API key
const openai = new OpenAI({
  apiKey: "dummy-key", // This is a placeholder - in a real app, use process.env.OPENAI_API_KEY
});

export async function generateChatResponse(
  userId: string,
  message: string,
  previousMessages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  try {
    // For demo purposes, we'll return a mock response
    // In a real app, you would use the OpenAI API
    
    // Check if the message is asking about tasks or schedule
    if (message.toLowerCase().includes("task") || 
        message.toLowerCase().includes("schedule") || 
        message.toLowerCase().includes("calendar") ||
        message.toLowerCase().includes("plan")) {
      
      // Get today's date and format it
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);
      
      // Get tasks for the date range
      const tasks = await getTasksByDateRange(
        userId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      return generateTaskResponse(tasks, message);
    }
    
    // Default responses
    const responses = [
      "I'm here to help with your financial planning and tasks. What would you like to know?",
      "You can ask me about your portfolio, tasks, or schedule. How can I assist you today?",
      "I can provide information about your investments and help manage your tasks. What do you need?",
      "Feel free to ask about your financial goals or upcoming tasks. I'm here to help!",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, I encountered an error processing your request. Please try again later.";
  }
}

function generateTaskResponse(tasks: Task[], message: string): string {
  if (tasks.length === 0) {
    return "You don't have any upcoming tasks scheduled. Would you like to create one?";
  }
  
  // Group tasks by date
  const tasksByDate: Record<string, Task[]> = {};
  tasks.forEach(task => {
    if (!task.dueDate) return;
    
    if (!tasksByDate[task.dueDate]) {
      tasksByDate[task.dueDate] = [];
    }
    tasksByDate[task.dueDate].push(task);
  });
  
  // Format the response
  let response = "Here's your upcoming schedule:\n\n";
  
  Object.keys(tasksByDate).sort().forEach(date => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    response += `${formattedDate}:\n`;
    
    tasksByDate[date].forEach(task => {
      const status = task.completed ? "✅ Completed" : "⏳ Pending";
      const amount = task.amount ? `(${task.amount})` : '';
      
      response += `- ${task.title} ${amount} - ${status}\n`;
    });
    
    response += '\n';
  });
  
  response += "Is there anything specific you'd like to know about your schedule or would you like to add a new task?";
  
  return response;
}
