import { useState } from "react";
import { FiExternalLink, FiChevronDown, FiChevronUp } from "react-icons/fi";

interface Source {
  title: string;
  url: string;
  content?: string;
}

interface SourceItemProps {
  source: Source;
  index: number;
}

export default function SourceItem({ source, index }: SourceItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
      <div 
        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded-full mr-2">
            {index + 1}
          </span>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {source.title}
          </h3>
        </div>
        <div className="flex items-center">
          {source.url && (
            <a 
              href={source.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              <FiExternalLink />
            </a>
          )}
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>
      
      {expanded && source.content && (
        <div className="p-3 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300">
          <p className="whitespace-pre-line">{source.content}</p>
        </div>
      )}
    </div>
  );
}
