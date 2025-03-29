import React, { useEffect, useRef } from 'react';
import { formatDateTime } from "~/utils/date";
import SourcesList from "~/components/SourcesList";
import { marked } from 'marked';

interface Source {
  title: string;
  url: string;
  content?: string;
}

interface ChatStreamMessageProps {
  content: string;
  role: 'user' | 'assistant';
  createdAt?: string;
  sources?: Source[];
  isStreaming?: boolean;
}

const ChatStreamMessage: React.FC<ChatStreamMessageProps> = ({ 
  content, 
  role, 
  createdAt, 
  sources = [],
  isStreaming = false
}) => {
  const isUser = role === 'user';
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (contentRef.current && !isUser) {
      try {
        contentRef.current.innerHTML = marked.parse(content || '');
      } catch (error) {
        console.error("Error parsing markdown:", error);
        contentRef.current.textContent = content || '';
      }
    }
  }, [content, isUser]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"} rounded-lg px-4 py-2 shadow`}>
        {isUser ? (
          <div className="whitespace-pre-line">{content}</div>
        ) : (
          <>
            <div 
              ref={contentRef} 
              className="prose dark:prose-invert prose-sm max-w-none"
            ></div>
            
            {isStreaming && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            )}
            
            {sources && sources.length > 0 && <SourcesList sources={sources} />}
          </>
        )}
        
        {createdAt && (
          <div className={`text-xs mt-1 ${isUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
            {formatDateTime(createdAt)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatStreamMessage;
