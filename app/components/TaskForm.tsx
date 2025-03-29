import { useState, useRef, useEffect } from "react";
import { Task } from "~/db/schema";
import { formatDateForInput, getCurrentDateForInput } from "~/utils/date";
import Button from "./Button";
import Input from "./Input";
import { FiX, FiPlus, FiList, FiRepeat } from "react-icons/fi";

interface TaskFormProps {
  task?: Task;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  isSubmitting?: boolean;
  onSwitchToRecurring?: () => void;
}

export default function TaskForm({ 
  task, 
  onSubmit, 
  onClose, 
  isSubmitting = false,
  onSwitchToRecurring
}: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [dueDate, setDueDate] = useState(task?.dueDate ? formatDateForInput(task.dueDate) : "");
  const [category, setCategory] = useState(task?.category || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [amount, setAmount] = useState(task?.amount?.toString() || "");
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkTasks, setBulkTasks] = useState("");
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (showBulkInput) {
      bulkInputRef.current?.focus();
    } else {
      titleInputRef.current?.focus();
    }
  }, [showBulkInput]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showBulkInput && bulkTasks.trim()) {
      // Handle bulk task creation
      const formData = new FormData();
      formData.append("_action", "bulk_create");
      formData.append("tasks", bulkTasks);
      formData.append("dueDate", dueDate);
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("amount", amount);
      
      onSubmit(formData);
    } else {
      // Handle single task creation/update
      const formData = new FormData();
      formData.append("_action", task ? "update" : "create");
      if (task) {
        formData.append("id", task.id);
      }
      formData.append("title", title);
      formData.append("description", description);
      formData.append("dueDate", dueDate);
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("amount", amount);
      
      onSubmit(formData);
    }
  };
  
  const toggleBulkInput = () => {
    setShowBulkInput(!showBulkInput);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {task ? "Edit Task" : "Add New Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {showBulkInput ? "Add Multiple Tasks" : "Add Single Task"}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleBulkInput}
                className="text-sm"
              >
                {showBulkInput ? (
                  <>
                    <FiPlus className="mr-1" /> Single Task
                  </>
                ) : (
                  <>
                    <FiList className="mr-1" /> Multiple Tasks
                  </>
                )}
              </Button>
              
              {onSwitchToRecurring && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSwitchToRecurring}
                  className="text-sm"
                >
                  <FiRepeat className="mr-1" /> Make Recurring
                </Button>
              )}
            </div>
          </div>
          
          {showBulkInput ? (
            <div>
              <label htmlFor="bulkTasks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Enter Multiple Tasks (one per line)
              </label>
              <textarea
                ref={bulkInputRef}
                id="bulkTasks"
                value={bulkTasks}
                onChange={(e) => setBulkTasks(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Buy groceries&#10;Pay electricity bill&#10;Call dentist"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Each line will be created as a separate task
              </p>
            </div>
          ) : (
            <>
              <Input
                ref={titleInputRef}
                id="title"
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Task title"
              />
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Task description"
                />
              </div>
            </>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="dueDate"
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={getCurrentDateForInput()}
            />
            
            <Input
              id="category"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Work, Personal, Finance"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              <option value="Work" />
              <option value="Personal" />
              <option value="Finance" />
              <option value="Health" />
              <option value="Shopping" />
            </datalist>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <Input
              id="amount"
              label="Amount (optional)"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Financial amount (if applicable)"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
