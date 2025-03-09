import { Task } from "~/db/schema";
import { getTasksByDateRange } from "~/db/tasks.server";

const API_BASE_URL = "http://localhost:8000"; // Base URL of your FastAPI server

export async function generateChatResponse(
  userId: string,
  message: string,
  previousMessages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<Response> {
  try {
    const chatRequest = {
      text: message,
      stream_output: true, // Set to true for streaming
    };

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream, application/json", // Important for SSE
      },
      body: JSON.stringify(chatRequest),
      duplex: 'half', // Required for some environments to send body with stream response
      signal: AbortSignal.timeout(30000) // 30 seconds timeout for the whole stream
    });

    if (!response.ok) {
      const error = await response.json(); // Try to parse JSON error, might not always be JSON for stream errors
      console.error("API Error:", error);
      throw new Error(`Chat API error: ${response.status} - ${error.detail || response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body received from the chat API for streaming.");
    }

    return response; // Return the ReadableStream
  } catch (error) {
    console.error("Error generating chat response:", error);
    // Return a stream that immediately yields an error message
    return new Response();
  }
}

export function addChatMessage() { return; }
export function createChatSession() { return {}; }
export function getChatMessages() { return; }
export function getChatSessions() { return {}; }

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
