import { useState, useRef, useEffect } from "react";
import { Task, RecurringPattern } from "~/db/schema";
import { formatDateForInput, getCurrentDateForInput } from "~/utils/date";
import Button from "./Button";
import Input from "./Input";
import { FiX, FiRepeat, FiCalendar } from "react-icons/fi";

interface RecurringTaskFormProps {
  task?: Task;
  pattern?: RecurringPattern;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function RecurringTaskForm({ 
  task, 
  pattern, 
  onSubmit, 
  onClose, 
  isSubmitting = false 
}: RecurringTaskFormProps) {
  // Task fields
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [dueDate, setDueDate] = useState(task?.dueDate ? formatDateForInput(task.dueDate) : getCurrentDateForInput());
  const [category, setCategory] = useState(task?.category || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [amount, setAmount] = useState(task?.amount?.toString() || "");
  
  // Recurring pattern fields
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">(
    pattern?.frequency || "monthly"
  );
  const [interval, setInterval] = useState(pattern?.interval?.toString() || "1");
  
  // Weekly options
  const [selectedDays, setSelectedDays] = useState<number[]>(
    pattern?.daysOfWeek ? pattern.daysOfWeek.split(",").map(d => parseInt(d.trim())) : []
  );
  
  // Monthly options
  const [dayOfMonth, setDayOfMonth] = useState(pattern?.dayOfMonth?.toString() || "");
  
  // Yearly options
  const [monthOfYear, setMonthOfYear] = useState(pattern?.monthOfYear?.toString() || "");
  
  // End options
  const [endType, setEndType] = useState<"never" | "after" | "on">(
    pattern?.occurrences ? "after" : pattern?.endDate ? "on" : "never"
  );
  const [occurrences, setOccurrences] = useState(pattern?.occurrences?.toString() || "10");
  const [endDate, setEndDate] = useState(
    pattern?.endDate ? formatDateForInput(pattern.endDate) : ""
  );
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("_action", task ? "update_recurring" : "create_recurring");
    
    if (task) {
      formData.append("id", task.id);
      if (pattern) {
        formData.append("patternId", pattern.id);
      }
    }
    
    // Task data
    formData.append("title", title);
    formData.append("description", description || "");
    formData.append("dueDate", dueDate);
    formData.append("category", category || "");
    formData.append("priority", priority);
    formData.append("amount", amount || "");
    
    // Recurring pattern data
    formData.append("frequency", frequency);
    formData.append("interval", interval);
    
    // Frequency-specific options
    if (frequency === "weekly") {
      formData.append("daysOfWeek", selectedDays.join(","));
    } else if (frequency === "monthly") {
      formData.append("dayOfMonth", dayOfMonth || "");
    } else if (frequency === "yearly") {
      formData.append("dayOfMonth", dayOfMonth || "");
      formData.append("monthOfYear", monthOfYear || "");
    }
    
    // End options
    if (endType === "after") {
      formData.append("occurrences", occurrences);
    } else if (endType === "on") {
      formData.append("endDate", endDate);
    }
    
    onSubmit(formData);
  };
  
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };
  
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {task ? "Edit Recurring Task" : "Add Recurring Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <FiCalendar className="mr-2" /> Task Details
            </h3>
            
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
                value={description || ""}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Task description"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="dueDate"
                label="First Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getCurrentDateForInput()}
                required
              />
              
              <Input
                id="category"
                label="Category"
                value={category || ""}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Finance, Investment"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                <option value="Finance" />
                <option value="Investment" />
                <option value="Bills" />
                <option value="Health" />
                <option value="Work" />
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
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <Input
                id="amount"
                label="Amount"
                type="number"
                step="0.01"
                value={amount || ""}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 500"
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <FiRepeat className="mr-2" /> Recurrence Pattern
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["daily", "weekly", "monthly", "yearly"].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    className={`px-3 py-2 rounded-md text-sm ${
                      frequency === freq
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-500"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent"
                    }`}
                    onClick={() => setFrequency(freq as any)}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="interval"
                label={`Repeat every (${frequency})`}
                type="number"
                min="1"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                required
              />
            </div>
            
            {frequency === "weekly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  On these days
                </label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      className={`w-10 h-10 rounded-full text-sm ${
                        selectedDays.includes(index + 1)
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-500"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent"
                      }`}
                      onClick={() => toggleDay(index + 1)}
                    >
                      {day.substring(0, 1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {frequency === "monthly" && (
              <div>
                <Input
                  id="dayOfMonth"
                  label="Day of month"
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="e.g., 15"
                />
              </div>
            )}
            
            {frequency === "yearly" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="monthOfYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Month
                  </label>
                  <select
                    id="monthOfYear"
                    value={monthOfYear}
                    onChange={(e) => setMonthOfYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select month</option>
                    {monthNames.map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                
                <Input
                  id="dayOfMonth"
                  label="Day"
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="e.g., 15"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="endNever"
                    name="endType"
                    checked={endType === "never"}
                    onChange={() => setEndType("never")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="endNever" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Never
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="endAfter"
                    name="endType"
                    checked={endType === "after"}
                    onChange={() => setEndType("after")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="endAfter" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    After
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={occurrences}
                    onChange={(e) => setOccurrences(e.target.value)}
                    disabled={endType !== "after"}
                    className="ml-2 w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">occurrences</span>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="endOn"
                    name="endType"
                    checked={endType === "on"}
                    onChange={() => setEndType("on")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="endOn" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    On
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={endType !== "on"}
                    min={getCurrentDateForInput()}
                    className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
