import { useState, useRef, useEffect } from "react";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

import { requireAuth } from "~/utils/auth";
import { createMessage, getUserMessages, getAIResponse } from "~/models/chat.server";
import { getUserTasks } from "~/models/tasks.server";
import Card from "~/components/Card";
import Button from "~/components/Button";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth(request);
  const messages = await getUserMessages(userId);
  const tasks = await getUserTasks(userId);
  
  return json({ messages, tasks });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  const content = formData.get("message") as string;
  
  if (!content) {
    return json({ error: "Message cannot be empty" }, { status: 400 });
  }
  
  // Create user message
  const userMessage = await createMessage(userId, content, true);
  
  // Get tasks for context
  const tasks = await getUserTasks(userId);
  
  // Get AI response
  const aiResponse = await getAIResponse(userId, content, tasks);
  
  return json({ userMessage, aiResponse });
}

export default function Chat() {
  const { messages, tasks } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Combine existing messages with new ones from action
  const allMessages = [...messages];
  if (actionData?.userMessage && !allMessages.find(m => m.id === actionData.userMessage.id)) {
    allMessages.push(actionData.userMessage);
  }
  if (actionData?.aiResponse && !allMessages.find(m => m.id === actionData.aiResponse.id)) {
    allMessages.push(actionData.aiResponse);
  }
  
  // Sort messages by timestamp
  allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!messageInput.trim()) {
      e.preventDefault();
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Chat Assistant</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask questions about your portfolio, tasks, or schedule
        </p>
      </div>
      
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-white font-medium">Portfolio Assistant</h2>
          <p className="text-blue-100 text-sm">Ask me anything about your investments or tasks</p>
        </div>
        
        <div 
          ref={chatContainerRef}
          className="h-[calc(100vh-320px)] overflow-y-auto p-6 bg-gray-50"
        >
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-blue-100 rounded-full p-4 mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Start a conversation</h3>
              <p className="text-gray-500 max-w-sm">
                Ask about your portfolio performance, upcoming tasks, or investment advice.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {allMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  {!message.isUser && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="bg-blue-600 rounded-full h-8 w-8 flex items-center justify-center">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-xs sm:max-w-md md:max-w-lg rounded-2xl px-4 py-3 ${
                      message.isUser
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.isUser ? "text-blue-200" : "text-gray-400"}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.isUser && (
                    <div className="flex-shrink-0 ml-3">
                      <div className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center">
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 p-4 bg-white">
          <Form method="post" onSubmit={handleSubmit}>
            <div className="flex items-center">
              <input
                type="text"
                name="message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-l-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                variant="primary"
                className="rounded-l-none rounded-r-full px-5"
                disabled={isSubmitting || !messageInput.trim()}
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </Button>
            </div>
          </Form>
        </div>
      </Card>
    </div>
  );
}
