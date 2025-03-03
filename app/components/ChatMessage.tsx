import { formatDateTime } from "~/utils/date";

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant";
  createdAt: string;
}

export default function ChatMessage({ content, role, createdAt }: ChatMessageProps) {
  const isUser = role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"} rounded-lg px-4 py-2 shadow`}>
        <div className="whitespace-pre-line">{content}</div>
        <div className={`text-xs mt-1 ${isUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
          {formatDateTime(createdAt)}
        </div>
      </div>
    </div>
  );
}
