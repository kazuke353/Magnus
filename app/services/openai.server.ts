import { json } from "@remix-run/node";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function generateChatResponse(
  userId: string,
  message: string,
  previousMessages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<Response> {
  try {
    const chatRequest = {
      text: message,
      previous_messages: previousMessages,
      stream_output: true,
    };

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      throw new Error(`Chat API error: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw error;
  }
}

export async function getConversations() {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
}

export async function deleteConversation(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
}

export async function getAvailableModels() {
  try {
    const response = await fetch(`${API_BASE_URL}/models`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
}

export async function switchModel(modelIndex: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/models/${modelIndex}`, {
      method: "PUT",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to switch model: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error switching model:", error);
    throw error;
  }
}

export async function createNewConversation() {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/new`, {
      method: "POST",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
}
