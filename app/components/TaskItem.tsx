import { useState } from "react";
import { FiEdit2, FiTrash2, FiDollarSign, FiCalendar, FiChevronDown, FiChevronUp, FiCheck } from "react-icons/fi";
import { Task } from "~/db/schema";
import { formatDate, formatDateWithDay, formatCurrency } from "~/utils/formatters";
import Button from "./Button";
import ReactMarkdown from "react-markdown";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onSelect?: () => void;
  isSelected?: boolean;
  currency?: string;
}

export default function TaskItem({ 
  task, 
  onEdit, 
  onDelete, 
  onToggleComplete,
  onSelect,
  isSelected,
  currency = "$"
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const priorityColors = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-30 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:bg-opacity-30 dark:text-yellow-300",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-300",
  };
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };
  
  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete(task.id, task.completed);
  };
  
  return (
    <div 
      className={`border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 ${
        isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-blue-400 dark:border-blue-500' : ''
      } ${
        onSelect ? 'cursor-pointer hover:shadow-md' : ''
      }`}
      onClick={onSelect}
    >
      <div className={`p-4 ${task.completed ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <button
              onClick={handleToggleComplete}
              className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center border ${
                task.completed 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'border-gray-300 dark:border-gray-600'
              } hover:border-blue-400 dark:hover:border-blue-500 transition-colors`}
              aria-label={`Mark task "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
            >
              {task.completed && <FiCheck className="h-3 w-3" />}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center">
                <h3 
                  className={`text-lg font-medium flex-1 ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
                >
                  {task.title}
                </h3>
                
                {task.description && (
                  <button 
                    onClick={handleToggleExpand}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                    aria-label={isExpanded ? "Collapse task details" : "Expand task details"}
                  >
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {task.priority && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                )}
                
                {task.category && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-300">
                    {task.category}
                  </span>
                )}
                
                {task.dueDate && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:bg-opacity-30 dark:text-purple-300">
                    <FiCalendar className="mr-1" />
                    {formatDateWithDay(task.dueDate)}
                  </span>
                )}
                
                {task.amount && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    <FiDollarSign className="mr-1" />
                    {formatCurrency(task.amount, currency)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              aria-label="Edit task"
              className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <FiEdit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete task"
              className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              <FiTrash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isExpanded && task.description && (
          <div className="mt-4 pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              <ReactMarkdown>{task.description}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
