import React from 'react';
import { format } from 'date-fns';

interface ChatStreamMessageProps {
  content: string | null;
  role: 'user' | 'assistant';
  createdAt?: string;
}

const ChatStreamMessage: React.FC<ChatStreamMessageProps> = ({ content, role }) => {
  const messageClass = role === 'user' ? 'bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-blue-100 ml-auto' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-auto';
  const textAlignClass = role === 'user' ? 'text-right' : 'text-left';


  return (
    <div className={`flex flex-col mb-4 ${role === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-4 shadow-md ${messageClass} ${textAlignClass}`}>
        {content}
        {content === "Waiting for response..." && (
          <div className="flex justify-start mt-2">
            <div className="max-w-[80%]  px-0 py-0 shadow-none">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" ></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} ></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} ></div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* <span className="text-gray-500 text-xs mt-1">{createdAt ? format(new Date(createdAt), 'MMM d, yyyy h:mm bb') : ''}</span> */}
    </div>
  );
};

export default ChatStreamMessage;