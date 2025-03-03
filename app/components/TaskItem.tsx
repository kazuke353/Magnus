import { useState } from "react";
import { FiEdit2, FiTrash2, FiDollarSign, FiCalendar } from "react-icons/fi";
import { Task } from "~/db/schema";
import { formatDate } from "~/utils/date";
import Button from "./Button";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

export default function TaskItem({ task, onEdit, onDelete, onToggleComplete }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const priorityColors = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-30 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:bg-opacity-30 dark:text-yellow-300",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-300",
  };
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden">
      <div className="p-4 bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggleComplete(task.id, !task.completed)}
              className="h-5 w-5 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <h3 
                className={`text-lg font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {task.title}
              </h3>
              
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
                    {formatDate(task.dueDate)}
                  </span>
                )}
                
                {task.amount && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    <FiDollarSign className="mr-1" />
                    {task.amount}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(task)}
              aria-label="Edit task"
            >
              <FiEdit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
            >
              <FiTrash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isExpanded && task.description && (
          <div className="mt-4 pl-8">
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{task.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
