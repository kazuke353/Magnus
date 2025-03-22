import { useLoaderData, useActionData, useSubmit, useNavigation, Form, useFetcher } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { addChatMessage as addChatMessageServer, createChatSession as createChatSessionServer, getChatMessages as getChatMessagesServer, getChatSessions as getChatSessionsServer, deleteChatSession as deleteChatSessionServer } from "~/db/chat.server";
import { getAvailableModels, switchModel, generateChatResponse } from "~/services/openai.server";
import { useState, useRef, useEffect } from "react";
import Button from "~/components/Button";
import Input from "~/components/Input";
import ChatMessage from "~/components/ChatMessage";
import ChatStreamMessage from "~/components/ChatStreamMessage";
import { FiSend, FiPlus, FiMessageSquare, FiTrash2 } from "react-icons/fi";
import Select from "~/components/Select";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthentication(request, "/login");

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");
  const streamAction = url.searchParams.get("stream");

  const sessions = await getChatSessionsServer(user.id);
  
  let modelsData;
  try {
    modelsData = await getAvailableModels(); // returns an array with models, similar to OpenAI, so current_index is not available
    modelsData = { models: modelsData, current_index: 0 };
  } catch (error) {
    console.error("Error fetching models:", error);
    modelsData = { models: [], current_index: 0 };
  }

  const models = modelsData.models || [];
  const currentModelIndex = modelsData.current_index || 0;

  let currentSession = null;
  let messages = [];

  if (sessionId) {
    // Get the specified session
    currentSession = sessions.find(session => session.id === sessionId) || null;

    if (currentSession) {
      messages = await getChatMessagesServer(currentSession.id);
    }
  } else if (sessions.length > 0) {
    // Get the most recent session
    currentSession = sessions[0];
    messages = await getChatMessagesServer(currentSession.id);
  }

  // Handle streaming request
  if (streamAction === "true" && sessionId) {
    const userMessage = url.searchParams.get("message");
    
    if (userMessage) {
      // Get previous messages for context
      const previousMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      try {
        // Generate streaming response
        const response = await generateChatResponse(user.id, userMessage, previousMessages);
        
        // Return the streaming response
        return new Response(response.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      } catch (error) {
        console.error("Error generating streaming response:", error);
        return new Response("data: " + JSON.stringify({ error: "Failed to generate response" }), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      }
    }
  }

  return json({ user, sessions, currentSession, messages, models, currentModelIndex });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuthentication(request, "/login");

  const formData = await request.formData();
  const action = formData.get("_action") as string;

  try {
    if (action === "switch_model") {
      const modelIndex = formData.get("model");
      if (!modelIndex) {
        return json({ error: "Model index is required" }, { status: 400 });
      }

      try {
        const result = await switchModel(parseInt(modelIndex as string));
        return json({ 
          success: true, 
          action: "switch_model",
          message: "Model switched successfully", 
          modelIndex: parseInt(modelIndex as string) 
        });
      } catch (error) {
        console.error("Error switching model in action:", error);
        return json({ 
          error: "Failed to switch model: " + (error as Error).message, 
          action: "switch_model" 
        }, { status: 500 });
      }
    }

    if (action === "save_message") {
      const sessionId = formData.get("sessionId") as string;
      const message = formData.get("message") as string;
      const role = formData.get("role") as "user" | "assistant";
      
      if (!sessionId || !message || !role) {
        return json({ error: "Missing required fields" }, { status: 400 });
      }
      
      await addChatMessageServer(sessionId, user.id, message, role);
      return json({ success: true, action: "save_message" });
    }

    if (action === "send_message") {
      let sessionId = formData.get("sessionId") as string;
      const message = formData.get("message") as string;
      
      if (!message.trim()) {
        return json({ error: "Message cannot be empty" });
      }
      
      // Create a new session if needed
      if (!sessionId) {
        const title = message.length > 30 ? message.substring(0, 30) + "..." : message;
        const session = await createChatSessionServer(user.id, title);
        sessionId = session.id;
      }
      
      // Add user message to database
      await addChatMessageServer(sessionId, user.id, message, "user");
      
      // Get updated data for the response
      const sessions = await getChatSessionsServer(user.id);
      const currentSession = sessions.find(session => session.id === sessionId) || null;
      const messages = currentSession ? await getChatMessagesServer(currentSession.id) : [];
      
      let modelsData;
      try {
        modelsData = await getAvailableModels();
        modelsData = { models: modelsData, current_index: 0 };
      } catch (error) {
        console.error("Error fetching models:", error);
        modelsData = { models: [], current_index: 0 };
      }
      
      return json({ 
        success: true, 
        action: "send_message",
        sessionId, 
        message,
        // Include these to prevent data loss during streaming
        sessions,
        currentSession,
        messages,
        models: modelsData.models || [],
        currentModelIndex: modelsData.current_index || 0
      });
    }

    if (action === "new_chat") {
      const session = await createChatSessionServer(user.id, "New Conversation");
      return json({ success: true, action: "new_chat", sessionId: session.id });
    }

    if (action === "delete_session") {
      const sessionId = formData.get("sessionId") as string;
      if (sessionId) {
        await deleteChatSessionServer(sessionId);
        return json({ success: true, action: "delete_session", deleted: true });
      }
      return json({ error: "Session ID is required" }, { status: 400 });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
}

export default function Chat() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const fetcher = useFetcher();

  // Safely extract data from loader with fallbacks
  const user = loaderData?.user;
  const [sessions, setSessions] = useState(loaderData?.sessions || []);
  const [currentSession, setCurrentSession] = useState(loaderData?.currentSession || null);
  const [messages, setMessages] = useState(loaderData?.messages || []);
  const [models, setModels] = useState(loaderData?.models || []);
  const [currentModelIndex, setCurrentModelIndex] = useState(loaderData?.currentModelIndex || 0);

  const [messageInput, setMessageInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [selectedModel, setSelectedModel] = useState(currentModelIndex);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update state when loader data changes
  useEffect(() => {
    if (loaderData) {
      if (loaderData.sessions) setSessions(loaderData.sessions);
      if (loaderData.currentSession) setCurrentSession(loaderData.currentSession);
      if (loaderData.messages) setMessages(loaderData.messages);
      if (loaderData.models) setModels(loaderData.models);
      if (loaderData.currentModelIndex !== undefined) {
        setCurrentModelIndex(loaderData.currentModelIndex);
        setSelectedModel(loaderData.currentModelIndex);
      }
    }
  }, [loaderData]);

  // Update state when action data changes
  useEffect(() => {
    if (actionData?.success) {
      // Update state with data from action response to prevent data loss during streaming
      if (actionData.sessions) setSessions(actionData.sessions);
      if (actionData.currentSession) setCurrentSession(actionData.currentSession);
      if (actionData.messages) setMessages(actionData.messages);
      if (actionData.models) setModels(actionData.models);
      if (actionData.currentModelIndex !== undefined) {
        setCurrentModelIndex(actionData.currentModelIndex);
        setSelectedModel(actionData.currentModelIndex);
      }
    }
  }, [actionData]);

  console.log("Models: ", models);
  
  // Create options for the model selector with null check
  const selectOptions = Array.isArray(models) 
    ? models.map(model => ({
        value: model.index.toString(),
        label: model.name,
      }))
    : [];

  // Scroll to bottom when messages change or streaming response updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  // Handle action responses
  useEffect(() => {
    if (actionData?.success) {
      if (actionData.action === "send_message" && actionData.sessionId) {
        // Update URL with session ID
        const url = new URL(window.location.href);
        url.searchParams.set("session", actionData.sessionId);
        window.history.pushState({}, "", url.toString());
        
        // Start streaming if we have a session
        if (useStreaming && actionData.sessionId) {
          startStreaming(actionData.sessionId, actionData.message);
        }
      }
      
      if (actionData.action === "delete_session" && actionData.deleted) {
        window.location.href = "/chat";
      }
      
      if (actionData.action === "switch_model") {
        console.log("Model switched to:", actionData.modelIndex);
      }
      
      if (actionData.action === "new_chat" && actionData.sessionId) {
        const url = new URL(window.location.href);
        url.searchParams.set("session", actionData.sessionId);
        window.location.href = url.toString();
      }
    }
  }, [actionData, useStreaming]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startStreaming = async (sessionId: string, userMessage: string) => {
    console.log("Started streaming", sessionId, userMessage)
    // Cancel any existing streaming request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsStreaming(true);
    setStreamingContent("");
    
    try {
      // Create the URL for the streaming request
      const url = new URL(window.location.href);
      url.searchParams.set("stream", "true");
      url.searchParams.set("message", userMessage);
      url.searchParams.set("session", sessionId);
      
      // Make the fetch request
      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }
      
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data:")) {
            console.log("Line: ", line)
            try {
              const data = JSON.parse(line.substring(5).trim());
              
              if (data.content) {
                accumulatedContent += data.content;
                console.log("accumulatedContent JSON: ", accumulatedContent);
                setStreamingContent(accumulatedContent);
              }
            } catch (e) {
              // If it's not valid JSON, just append the raw data
              const rawData = line.substring(5).trim();
              if (rawData && rawData !== "[DONE]") {
                accumulatedContent += rawData;
                console.log("accumulatedContent non-JSON: ", accumulatedContent);
                setStreamingContent(accumulatedContent);
              }
            }
          }
        }
      }
      
      // Save the complete response to the database
      if (accumulatedContent) {
        const formData = new FormData();
        formData.append("_action", "save_message");
        formData.append("sessionId", sessionId);
        formData.append("message", accumulatedContent);
        formData.append("role", "assistant");
        
        // After saving, update the messages list
        const savedResponse = await fetch("/chat", {
          method: "post",
          body: formData
        });
        
        if (savedResponse.ok) {
          // Refresh the page to get updated messages
          window.location.href = `/chat?session=${sessionId}`;
        }
      }
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Error in streaming:", error);
        setStreamingContent("Sorry, there was an error generating a response. Please try again.");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || isStreaming) return;
    
    const formData = new FormData();
    formData.append("_action", "send_message");
    if (currentSession) {
      formData.append("sessionId", currentSession.id);
    }
    formData.append("message", messageInput);
    
    submit(formData, { method: "post" });
    setMessageInput("");
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    
    const formData = new FormData();
    formData.append("_action", "new_chat");
    submit(formData, { method: "post" });
  };

  const handleDeleteSession = (sessionId: string) => {
    if (isStreaming) return;
    
    if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      const formData = new FormData();
      formData.append("_action", "delete_session");
      formData.append("sessionId", sessionId);
      submit(formData, { method: "post" });
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelIndex = parseInt(e.target.value);
    setSelectedModel(newModelIndex);
    
    const formData = new FormData();
    formData.append("_action", "switch_model");
    formData.append("model", newModelIndex.toString());
    submit(formData, { method: "post" });
  };

  const isSubmitting = navigation.state === "submitting" && !isStreaming;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chat Assistant</h1>
          <p className="text-gray-600 dark:text-gray-400">Ask questions about your finances, tasks, or get help with planning.</p>
        </div>
        
        <div className="flex space-x-2">
          <div className="flex items-center mr-4">
            <label htmlFor="streaming-toggle" className="mr-2 text-sm text-gray-700 dark:text-gray-300">
              Streaming
            </label>
            <input
              id="streaming-toggle"
              type="checkbox"
              checked={useStreaming}
              onChange={() => setUseStreaming(!useStreaming)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          {Array.isArray(models) && models.length > 0 && (
            <Select
              id="model-select"
              value={selectedModel.toString()}
              onChange={handleModelChange}
              className="text-sm"
              options={selectOptions}
            />
          )}
          
          <Button onClick={handleNewChat} disabled={isStreaming}>
            <FiPlus className="mr-2" />
            New Chat
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat sessions sidebar */}
        <div className="hidden md:block w-64 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">Conversations</h2>
          </div>
          <div className="p-2">
            {sessions.length > 0 ? (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center group">
                    <a
                      href={`/chat?session=${session.id}`}
                      className={`flex-1 block px-3 py-2 rounded-md text-sm ${
                        currentSession?.id === session.id
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center">
                        <FiMessageSquare className="mr-2 flex-shrink-0" />
                        <span className="truncate">{session.title}</span>
                      </div>
                    </a>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete conversation"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No conversations yet
              </div>
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length > 0 || isStreaming ? (
              <div>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    content={message.content}
                    role={message.role}
                    createdAt={message.createdAt}
                  />
                ))}
                
                {isStreaming && (
                  <ChatStreamMessage
                    content={streamingContent}
                    role="assistant"
                    isStreaming={true}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <FiMessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Welcome to the Chat Assistant
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Ask questions about your finances, get help with tasks, or inquire about your schedule.
                </p>
              </div>
            )}
            
            {isSubmitting && !isStreaming && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[80%] bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2 shadow">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <Form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                id="message"
                name="message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isSubmitting || isStreaming}
              />
              <Button
                type="submit"
                disabled={!messageInput.trim() || isSubmitting || isStreaming}
                isLoading={isSubmitting && !isStreaming}
              >
                <FiSend />
              </Button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
