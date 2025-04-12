import { json } from "@remix-run/node";
import { getUserApiKey } from "~/db/apiKeys.server"; // Import the function to get API key

const API_BASE_URL = "https://api.openai.com/v1"; // Use official OpenAI endpoint

export async function generateChatResponse(
  userId: string, // Add userId to fetch the correct key
  message: string,
  previousMessages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<Response> {
  try {
    // 1. Get the user's OpenAI API key
    const apiKey = await getUserApiKey(userId, 'openai'); // Assuming service name is 'openai'

    if (!apiKey) {
      throw new Error("OpenAI API key not configured for this user.");
    }

    // Prepare messages for OpenAI API format
    const messages = [
      { role: "system", content: "You are a helpful financial assistant." },
      ...previousMessages,
      { role: "user", content: message }
    ];

    const chatRequest = {
      model: "gpt-4", // Or your preferred model
      messages: messages,
      stream: true, // Keep streaming enabled
    };

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`, // Use the fetched API key
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(chatRequest),
      // duplex: 'half', // May still be needed depending on environment
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        // Try parsing as JSON for more detailed OpenAI errors
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.error?.message || errorText;
      } catch (e) {
        // Ignore parsing error, use plain text
      }
      console.error("OpenAI API Error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    return response; // Return the streaming response
  } catch (error) {
    console.error("Error generating OpenAI chat response:", error);
    // Return an error response or re-throw
    // For simplicity, re-throwing; adjust as needed for UI feedback
    throw error;
  }
}

// --- Other functions remain the same, assuming they don't need user-specific keys ---
// --- OR update them similarly if they do need keys ---

export async function getConversations() {
  // This likely doesn't need a user-specific key if it's fetching from your *own* backend
  // If it calls an external service requiring a key, update similarly to generateChatResponse
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`); // Assuming this is YOUR backend
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
  // Similar assumption as getConversations
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, { // Assuming this is YOUR backend
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
    // This might call OpenAI or your own backend.
    // If OpenAI, it needs an API key. Let's assume it needs one for demonstration.
    // NOTE: You might want a generic 'admin' key for this, or fetch the user's key.
    // Using the user's key might be slightly inefficient if the model list is static.
    // For simplicity, let's assume it doesn't need a user-specific key here,
    // but be aware you might need to adjust this based on your actual API design.
    try {
        // Example: If calling OpenAI directly
        // const apiKey = await getUserApiKey(SOME_DEFAULT_USER_ID_OR_ADMIN_KEY, 'openai');
        // if (!apiKey) throw new Error("API key needed to fetch models.");
        // headers: { "Authorization": `Bearer ${apiKey}` }

        const response = await fetch(`${API_BASE_URL}/models`); // Assuming this is YOUR backend or doesn't need auth
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
  // Similar assumption as getAvailableModels
  try {
    const response = await fetch(`${API_BASE_URL}/models/${modelIndex}`, { // Assuming this is YOUR backend
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
  // Similar assumption as getConversations
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/new`, { // Assuming this is YOUR backend
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
