import { useState } from "react";
import { Task, RecurringPattern } from "~/db/schema";
import { formatDate, isToday, isPast } from "~/utils/date";
import { FiEdit2, FiTrash2, FiCalendar, FiRepeat, FiClock, FiDollarSign } from "react-icons/fi";
import Button from "./Button";

interface RecurringTaskItemProps {
  task: Task;
  pattern: RecurringPattern;
  occurrences: Task[];
  onEdit: (task: Task, pattern: RecurringPattern) => void;
  onDelete: (id: string) => void;
  currency: string;
}

export default function RecurringTaskItem({ 
  task, 
  pattern, 
  occurrences, 
  onEdit, 
  onDelete,
  currency 
}: RecurringTaskItemProps) {
  const [showOccurrences, setShowOccurrences] = useState(false);
  
  const getFrequencyText = () => {
    switch (pattern.frequency) {
      case "daily":
        return `Every ${pattern.interval > 1 ? `${pattern.interval} days` : "day"}`;
      case "weekly":
        if (pattern.daysOfWeek) {
          const days = pattern.daysOfWeek.split(",").map(d => {
            const dayNum = parseInt(d.trim());
            return ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayNum];
          }).join(", ");
          return `Every ${pattern.interval > 1 ? `${pattern.interval} weeks` : "week"} on ${days}`;
        }
        return `Every ${pattern.interval > 1 ? `${pattern.interval} weeks` : "week"}`;
      case "monthly":
        if (pattern.dayOfMonth) {
          return `Every ${pattern.interval > 1 ? `${pattern.interval} months` : "month"} on day ${pattern.dayOfMonth}`;
        }
        return `Every ${pattern.interval > 1 ? `${pattern.interval} months` : "month"}`;
      case "yearly":
        if (pattern.monthOfYear && pattern.dayOfMonth) {
          const monthName = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ][pattern.monthOfYear - 1];
          return `Every ${pattern.interval > 1 ? `${pattern.interval} years` : "year"} on ${monthName} ${pattern.dayOfMonth}`;
        }
        return `Every ${pattern.interval > 1 ? `${pattern.interval} years` : "year"}`;
      default:
        return "Custom schedule";
    }
  };
  
  const getEndText = () => {
    if (pattern.occurrences) {
      return `for ${pattern.occurrences} occurrences`;
    } else if (pattern.endDate) {
      return `until ${formatDate(pattern.endDate)}`;
    }
    return "indefinitely";
  };
  
  const nextOccurrence = occurrences.length > 0 ? occurrences[0] : null;
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{task.title}</h3>
            
            <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <FiRepeat className="mr-1" />
              <span>{getFrequencyText()} {getEndText()}</span>
            </div>
            
            {nextOccurrence && (
              <div className="mt-1 flex items-center text-sm">
                <FiCalendar className="mr-1" />
                <span className={`${
                  isToday(nextOccurrence.dueDate || "") 
                    ? "text-blue-600 dark:text-blue-400" 
                    : isPast(nextOccurrence.dueDate || "") 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-gray-600 dark:text-gray-400"
                }`}>
                  Next: {nextOccurrence.dueDate ? formatDate(nextOccurrence.dueDate) : "Not scheduled"}
                </span>
              </div>
            )}
            
            {task.amount && (
              <div className="mt-1 flex items-center text-sm text-gray-600 dark:text-gray-400">
                <FiDollarSign className="mr-1" />
                <span>{currency}{task.amount.toFixed(2)}</span>
              </div>
            )}
            
            {task.category && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {task.category}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(task, pattern)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Edit"
            >
              <FiEdit2 size={18} />
            </button>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this recurring task? All future occurrences will be removed.")) {
                  onDelete(task.id);
                }
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Delete"
            >
              <FiTrash2 size={18} />
            </button>
          </div>
        </div>
        
        {task.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
        )}
        
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowOccurrences(!showOccurrences)}
          >
            <FiClock className="mr-1" />
            {showOccurrences ? "Hide Occurrences" : "Show Occurrences"}
          </Button>
        </div>
      </div>
      
      {showOccurrences && occurrences.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="p-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upcoming Occurrences
            </h4>
            <ul className="space-y-1">
              {occurrences.map(occurrence => (
                <li key={occurrence.id} className="text-sm flex justify-between items-center">
                  <span className={`${
                    isToday(occurrence.dueDate || "") 
                      ? "text-blue-600 dark:text-blue-400 font-medium" 
                      : isPast(occurrence.dueDate || "") 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-gray-600 dark:text-gray-400"
                  }`}>
                    {occurrence.dueDate ? formatDate(occurrence.dueDate) : "Not scheduled"}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    occurrence.completed 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}>
                    {occurrence.completed ? "Completed" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
