import { useLoaderData, useActionData, useSubmit, useNavigation, Form } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { addChatMessage, createChatSession, getChatMessages, getChatSessions } from "~/db/chat.server";
import { generateChatResponse } from "~/services/openai.server";
import { useState, useRef, useEffect } from "react";
import Card from "~/components/Card";
import Button from "~/components/Button";
import Input from "~/components/Input";
import ChatMessage from "~/components/ChatMessage";
import { FiSend, FiPlus, FiMessageSquare } from "react-icons/fi";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthentication(request, "/login");
  
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");
  
  const sessions = await getChatSessions(user.id);
  
  let currentSession = null;
  let messages = [];
  
  if (sessionId) {
    // Get the specified session
    currentSession = sessions.find(session => session.id === sessionId) || null;
    
    if (currentSession) {
      messages = await getChatMessages(currentSession.id);
    }
  } else if (sessions.length > 0) {
    // Get the most recent session
    currentSession = sessions[0];
    messages = await getChatMessages(currentSession.id);
  }
  
  return json({ user, sessions, currentSession, messages });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuthentication(request, "/login");
  
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  
  try {
    if (action === "send_message") {
      let sessionId = formData.get("sessionId") as string;
      const message = formData.get("message") as string;
      
      if (!message.trim()) {
        return json({ error: "Message cannot be empty" });
      }
      
      // Create a new session if needed
      if (!sessionId) {
        const title = message.length > 30 ? message.substring(0, 30) + "..." : message;
        const session = await createChatSession(user.id, title);
        sessionId = session.id;
      }
      
      // Add user message
      await addChatMessage(sessionId, user.id, message, "user");
      
      // Get previous messages for context
      const messages = await getChatMessages(sessionId);
      const previousMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Generate AI response
      const aiResponse = await generateChatResponse(user.id, message, previousMessages);
      
      // Add AI response
      await addChatMessage(sessionId, user.id, aiResponse, "assistant");
      
      return json({ success: true, sessionId });
    }
    
    if (action === "new_chat") {
      const session = await createChatSession(user.id, "New Conversation");
      return json({ success: true, sessionId: session.id });
    }
    
    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
}

export default function Chat() {
  const { user, sessions, currentSession, messages } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Redirect to new session if created
  useEffect(() => {
    if (actionData?.success && actionData.sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set("session", actionData.sessionId);
      window.history.pushState({}, "", url.toString());
    }
  }, [actionData]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim()) return;
    
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
    const formData = new FormData();
    formData.append("_action", "new_chat");
    submit(formData, { method: "post" });
  };
  
  const isSubmitting = navigation.state === "submitting";
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chat Assistant</h1>
          <p className="text-gray-600 dark:text-gray-400">Ask questions about your finances, tasks, or get help with planning.</p>
        </div>
        
        <Button onClick={handleNewChat}>
          <FiPlus className="mr-2" />
          New Chat
        </Button>
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
                  <a
                    key={session.id}
                    href={`/chat?session=${session.id}`}
                    className={`block px-3 py-2 rounded-md text-sm ${
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
            {messages.length > 0 ? (
              <div>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    content={message.content}
                    role={message.role}
                    createdAt={message.createdAt}
                  />
                ))}
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
            
            {isSubmitting && (
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
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                disabled={!messageInput.trim() || isSubmitting}
                isLoading={isSubmitting}
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
