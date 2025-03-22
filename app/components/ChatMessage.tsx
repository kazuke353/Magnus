import { useState } from "react";
import { FiUser, FiCpu, FiCopy, FiCheck } from "react-icons/fi";
import { marked } from "marked";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse markdown for assistant messages
  const formattedContent = message.role === "assistant" 
    ? { __html: marked.parse(message.content) } 
    : { __html: message.content };

  return (
    <div className={`p-4 mb-4 rounded-lg flex ${
      message.role === "user" 
        ? "bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20" 
        : "bg-gray-50 dark:bg-gray-800"
    }`}>
      <div className="flex-shrink-0 mr-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          message.role === "user"
            ? "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300"
            : "bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300"
        }`}>
          {message.role === "user" ? <FiUser /> : <FiCpu />}
        </div>
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-1">
          <div className="font-medium text-sm text-gray-700 dark:text-gray-300">
            {message.role === "user" ? "You" : "Assistant"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
        
        {message.role === "assistant" ? (
          <div 
            className="prose dark:prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={formattedContent}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {message.content}
          </div>
        )}
      </div>
      
      {message.role === "assistant" && (
        <button 
          onClick={copyToClipboard}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
        </button>
      )}
    </div>
  );
}
