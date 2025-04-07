import { useState, useRef, useEffect } from "react";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getChatHistory, saveChatMessage } from "~/db/chat.server";
import { streamChatResponse } from "~/services/chat.server";
import { FiSend, FiTrash2 } from "react-icons/fi";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Card from "~/components/Card";
import ChatMessage from "~/components/ChatMessage";
import ChatStreamMessage from "~/components/ChatStreamMessage";
import ModelSelector from "~/components/ModelSelector";
import EmptyState from "~/components/EmptyState";
import { showToast } from "~/components/ToastContainer";
import { errorResponse } from "~/utils/error-handler";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await requireAuthentication(request);
    const chatHistory = null;
    
    return json({ user, chatHistory });
  } catch (error) {
    return errorResponse(error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const user = await requireAuthentication(request);
    const formData = await request.formData();
    const action = formData.get("_action");
    
    if (action === "send") {
      const message = formData.get("message") as string;
      const model = formData.get("model") as string;
      
      if (!message || message.trim() === "") {
        return json({ error: "Message cannot be empty" }, { status: 400 });
      }
      
      // Save user message
      const userMessage = await saveChatMessage({
        userId: user.id,
        role: "user",
        content: message,
        model
      });
      
      return json({ userMessage, streaming: true });
    }
    
    if (action === "clear") {
      // Clear chat history logic would go here
      // For now, just redirect to refresh the page
      return redirect("/chat");
    }
    
    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};

export default function Chat() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const messageInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState("");
  const [model, setModel] = useState("gpt-4");
  const [chatHistory, setChatHistory] = useState(loaderData.chatHistory || []);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Update chat history when loader data changes
  useEffect(() => {
    if (loaderData.chatHistory) {
      setChatHistory(loaderData.chatHistory);
    }
  }, [loaderData.chatHistory]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, streamingResponse]);
  
  // Focus input after sending message
  useEffect(() => {
    if (navigation.state === "idle" && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [navigation.state]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    const formData = new FormData();
    formData.append("_action", "send");
    formData.append("message", message);
    formData.append("model", model);
    
    submit(formData, { method: "post" });
    setMessage("");
  };
  
  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      const formData = new FormData();
      formData.append("_action", "clear");
      submit(formData, { method: "post" });
      
      showToast({
        type: "info",
        message: "Chat history cleared",
        duration: 3000
      });
    }
  };
  
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formData?.get("_action") === "send";
  
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Assistant</h1>
        
        <div className="flex items-center space-x-2">
          <ModelSelector value={model} onChange={setModel} disabled={isSubmitting || isStreaming} />
          
          <Button 
            variant="outline" 
            onClick={handleClearChat}
            disabled={isSubmitting || isStreaming || chatHistory.length === 0}
          >
            <FiTrash2 className="mr-2" />
            Clear Chat
          </Button>
        </div>
      </div>
      
      <Card className="flex-grow overflow-hidden mb-4">
        <div 
          ref={chatContainerRef}
          className="h-full overflow-y-auto p-4"
        >
          {chatHistory.length === 0 && !isStreaming ? (
            <EmptyState
              icon={<FiSend className="h-6 w-6" />}
              title="No messages yet"
              description="Start a conversation with your financial assistant."
            />
          ) : (
            <div className="space-y-4">
              {chatHistory.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              
              {isStreaming && (
                <ChatStreamMessage content={streamingResponse} />
              )}
            </div>
          )}
        </div>
      </Card>
      
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Input
          ref={messageInputRef}
          type="text"
          placeholder="Ask about your finances..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSubmitting || isStreaming}
          className="flex-grow"
        />
        
        <Button 
          type="submit" 
          disabled={!message.trim() || isSubmitting || isStreaming}
          isLoading={isSubmitting}
        >
          <FiSend className="mr-2" />
          Send
        </Button>
      </form>
    </div>
  );
}
