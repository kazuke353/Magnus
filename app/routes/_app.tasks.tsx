import { useState, useEffect, useMemo } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { FiPlus, FiCalendar, FiList, FiUpload, FiRepeat, FiFilter, FiSearch, FiSliders } from "react-icons/fi";
import TaskItem from "~/components/TaskItem";
import TaskForm from "~/components/TaskForm";
import TaskDetail from "~/components/TaskDetail";
import TaskCalendar from "~/components/TaskCalendar";
import Button from "~/components/Button";
import EmptyState from "~/components/EmptyState";
import { requireAuthentication } from "~/services/auth.server";
import { 
  getUserTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  createBulkTasks,
  getRecurringTasksForUser,
  getTaskOccurrences,
  createRecurringTask,
  updateRecurringPattern,
  deleteRecurringPattern,
  getRecurringPatternById,
  getTaskById
} from "~/db/tasks.server";
import { getUserById } from "~/db/user.server";
import { formatDate, getCurrentDateForInput } from "~/utils/date";
import ImportTasksModal from "~/components/ImportTasksModal";
import RecurringTaskForm from "~/components/RecurringTaskForm";
import RecurringTaskItem from "~/components/RecurringTaskItem";
import { Task, RecurringPattern } from "~/db/schema";
import { db } from "~/db/database.server";
import { eq } from "drizzle-orm";
import { tasks } from "~/db/schema";
import Input from "~/components/Input";
import Select from "~/components/Select";

// Helper function to strip code blocks from imported text
const stripCodeBlocks = (text) => {
  if (!text) return "";
  // This regex removes markdown code blocks and inline code
  return text.replace(/```(?:[a-zA-Z0-9]*\n)?(.*?)```/gs, "$1")
            .replace(/`(.*?)`/g, "$1")
            .trim();
};

export const loader = async ({ request }) => {
  const user = await requireAuthentication(request);
  const userId = user.id;
  
  try {
    // Get user for currency preference
    const userDetails = await getUserById(userId);
    const currency = userDetails?.settings?.currency === "USD" ? "$" : 
                    userDetails?.settings?.currency === "EUR" ? "€" : 
                    userDetails?.settings?.currency === "GBP" ? "£" : "$";
    
    // Get all tasks
    const tasks = await getUserTasks(userId);
    
    // Get recurring tasks (parent tasks only)
    const recurringTasks = await getRecurringTasksForUser(userId);
    
    // Get occurrences for each recurring task
    const recurringTasksWithOccurrences = await Promise.all(
      recurringTasks.map(async (task) => {
        const pattern = task.recurringPatternId 
          ? await getRecurringPatternById(task.recurringPatternId) 
          : null;
        
        const occurrences = task.id 
          ? await getTaskOccurrences(task.id) 
          : [];
        
        return {
          task,
          pattern,
          occurrences
        };
      })
    );
    
    // Filter out parent recurring tasks from the regular tasks list
    // Only show occurrences in the main task list
    const regularTasks = tasks.filter(task => !task.isRecurring || task.parentTaskId);
    
    // Extract unique categories for filtering
    const categories = [...new Set(regularTasks.filter(task => task.category).map(task => task.category))];
    
    return json({ 
      tasks: regularTasks, 
      recurringTasks: recurringTasksWithOccurrences,
      categories,
      currency
    });
  } catch (error) {
    console.error("Error loading tasks:", error);
    return json({ 
      tasks: [], 
      recurringTasks: [],
      categories: [],
      currency: "$",
      error: "Failed to load tasks" 
    });
  }
};

export const action = async ({ request }) => {
  const user = await requireAuthentication(request);
  const userId = user.id;
  const formData = await request.formData();
  const action = formData.get("_action");
  
  try {
    switch (action) {
      case "create": {
        const title = formData.get("title");
        const description = formData.get("description");
        const dueDate = formData.get("dueDate");
        const category = formData.get("category");
        const priority = formData.get("priority");
        const amount = formData.get("amount") ? parseFloat(formData.get("amount")) : null;
        
        if (!title) {
          return json({ error: "Title is required" }, { status: 400 });
        }
        
        const task = await createTask({
          userId,
          title,
          description,
          dueDate,
          category,
          priority,
          amount,
          completed: false,
          isRecurring: false,
          recurringPatternId: null,
          parentTaskId: null
        });
        
        return json({ task });
      }
      
      case "update": {
        const id = formData.get("id");
        const title = formData.get("title");
        const description = formData.get("description");
        const dueDate = formData.get("dueDate");
        const category = formData.get("category");
        const priority = formData.get("priority");
        const completed = formData.get("completed") === "true";
        const amount = formData.get("amount") ? parseFloat(formData.get("amount")) : null;
        
        if (!id || !title) {
          return json({ error: "ID and title are required" }, { status: 400 });
        }
        
        const task = await updateTask(id, {
          title,
          description,
          dueDate,
          category,
          priority,
          completed,
          amount
        });
        
        return json({ task });
      }
      
      case "delete": {
        const id = formData.get("id");
        
        if (!id) {
          return json({ error: "ID is required" }, { status: 400 });
        }
        
        await deleteTask(id);
        return json({ success: true });
      }
      
      case "toggle": {
        const id = formData.get("id");
        const completed = formData.get("completed") === "true";
        
        if (!id) {
          return json({ error: "ID is required" }, { status: 400 });
        }
        
        const task = await updateTask(id, { completed });
        return json({ task });
      }
      
      case "bulk_create": {
        const titles = formData.get("titles").split("\n").filter(Boolean);
        const dueDate = formData.get("dueDate") || null;
        const category = formData.get("category") || null;
        const priority = formData.get("priority") || "medium";
        
        if (titles.length === 0) {
          return json({ error: "At least one task title is required" }, { status: 400 });
        }
        
        const tasks = await createBulkTasks(userId, titles, {
          dueDate,
          category,
          priority
        });
        
        return json({ tasks });
      }
      
      case "create_recurring": {
        // Task data
        const title = formData.get("title");
        const description = formData.get("description");
        const dueDate = formData.get("dueDate");
        const category = formData.get("category");
        const priority = formData.get("priority");
        const amount = formData.get("amount") ? parseFloat(formData.get("amount")) : null;
        
        // Recurring pattern data
        const frequency = formData.get("frequency");
        const interval = parseInt(formData.get("interval") || "1");
        const daysOfWeek = formData.get("daysOfWeek") || null;
        const dayOfMonth = formData.get("dayOfMonth") ? parseInt(formData.get("dayOfMonth")) : null;
        const monthOfYear = formData.get("monthOfYear") ? parseInt(formData.get("monthOfYear")) : null;
        const occurrences = formData.get("occurrences") ? parseInt(formData.get("occurrences")) : null;
        const endDate = formData.get("endDate") || null;
        
        if (!title || !frequency) {
          return json({ error: "Title and frequency are required" }, { status: 400 });
        }
        
        const { task, pattern } = await createRecurringTask(
          {
            userId,
            title,
            description,
            dueDate,
            category,
            priority,
            amount,
            completed: false
          },
          {
            userId,
            frequency,
            interval,
            daysOfWeek,
            dayOfMonth,
            monthOfYear,
            occurrences,
            endDate
          }
        );
        
        return json({ task, pattern });
      }
      
      case "update_recurring": {
        const id = formData.get("id");
        const patternId = formData.get("patternId");
        
        // Task data
        const title = formData.get("title");
        const description = formData.get("description");
        const dueDate = formData.get("dueDate");
        const category = formData.get("category");
        const priority = formData.get("priority");
        const amount = formData.get("amount") ? parseFloat(formData.get("amount")) : null;
        
        // Recurring pattern data
        const frequency = formData.get("frequency");
        const interval = parseInt(formData.get("interval") || "1");
        const daysOfWeek = formData.get("daysOfWeek") || null;
        const dayOfMonth = formData.get("dayOfMonth") ? parseInt(formData.get("dayOfMonth")) : null;
        const monthOfYear = formData.get("monthOfYear") ? parseInt(formData.get("monthOfYear")) : null;
        const occurrences = formData.get("occurrences") ? parseInt(formData.get("occurrences")) : null;
        const endDate = formData.get("endDate") || null;
        
        if (!id || !patternId || !title || !frequency) {
          return json({ error: "ID, pattern ID, title, and frequency are required" }, { status: 400 });
        }
        
        // Update the task
        const task = await updateTask(id, {
          title,
          description,
          dueDate,
          category,
          priority,
          amount
        });
        
        // Update the recurring pattern
        const pattern = await updateRecurringPattern(patternId, {
          frequency,
          interval,
          daysOfWeek,
          dayOfMonth,
          monthOfYear,
          occurrences,
          endDate
        });
        
        return json({ task, pattern });
      }
      
      case "delete_recurring": {
        const id = formData.get("id");
        
        if (!id) {
          return json({ error: "ID is required" }, { status: 400 });
        }
        
        // Get the task to find its pattern ID
        const task = await getTaskById(id);
        
        if (task && task.recurringPatternId) {
          // Delete the recurring pattern (this will also update related tasks)
          await deleteRecurringPattern(task.recurringPatternId);
        }
        
        // Delete the parent task
        await deleteTask(id);
        
        return json({ success: true });
      }
      
      case "import_tasks": {
        const tasksJson = formData.get("tasksJson");
        
        if (!tasksJson) {
          return json({ error: "No task data provided" }, { status: 400 });
        }
        
        try {
          // Strip code blocks from the JSON text before parsing
          const cleanedJson = stripCodeBlocks(tasksJson);
          const tasksData = JSON.parse(cleanedJson);
          
          if (!Array.isArray(tasksData)) {
            return json({ error: "Invalid task data format" }, { status: 400 });
          }
          
          const createdTasks = [];
          
          for (const taskData of tasksData) {
            // Check if it's a recurring task
            if (taskData.recurring) {
              try {
                const { frequency, interval, daysOfWeek, dayOfMonth, monthOfYear, occurrences, endDate } = taskData.recurring;
                
                const { task } = await createRecurringTask(
                  {
                    userId,
                    title: taskData.title,
                    description: taskData.description || "",
                    dueDate: taskData.dueDate || getCurrentDateForInput(),
                    category: taskData.category || "",
                    priority: taskData.priority || "medium",
                    amount: taskData.amount || null,
                    completed: false
                  },
                  {
                    userId,
                    frequency,
                    interval: interval || 1,
                    daysOfWeek: daysOfWeek || null,
                    dayOfMonth: dayOfMonth || null,
                    monthOfYear: monthOfYear || null,
                    occurrences: occurrences || null,
                    endDate: endDate || null
                  }
                );
                
                createdTasks.push(task);
              } catch (error) {
                console.error("Error importing recurring task:", error);
                return json({ error: `Error importing recurring task: ${error.message}` }, { status: 500 });
              }
            } else {
              // Regular task
              const task = await createTask({
                userId,
                title: taskData.title,
                description: taskData.description || "",
                dueDate: taskData.dueDate || null,
                category: taskData.category || "",
                priority: taskData.priority || "medium",
                amount: taskData.amount || null,
                completed: false,
                isRecurring: false,
                recurringPatternId: null,
                parentTaskId: null
              });
              
              createdTasks.push(task);
            }
          }
          
          return json({ success: true, tasksCreated: createdTasks.length });
        } catch (error) {
          console.error("Error importing JSON tasks:", error);
          return json({ error: `Failed to import tasks: ${error.message}` }, { status: 500 });
        }
      }
      
      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error in ${action} action:`, error);
    return json({ error: error.message }, { status: 500 });
  }
};

export default function TasksPage() {
  const { tasks, recurringTasks, categories, currency } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurringTask, setEditingRecurringTask] = useState(null);
  const [editingRecurringPattern, setEditingRecurringPattern] = useState(null);
  const [view, setView] = useState("list");
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Filtering and sorting state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterDueDate, setFilterDueDate] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  
  const isSubmitting = navigation.state === "submitting";
  
  useEffect(() => {
    if (actionData?.task && !isSubmitting) {
      setShowTaskForm(false);
      setSelectedTask(null);
    }
    
    if (actionData?.success && !isSubmitting) {
      setShowTaskForm(false);
      setShowRecurringForm(false);
      setSelectedTask(null);
      setEditingRecurringTask(null);
      setEditingRecurringPattern(null);
      setShowImportModal(false);
    }
  }, [actionData, isSubmitting]);
  
  const handleCreateTask = (formData) => {
    submit(formData, { method: "post" });
  };
  
  const handleUpdateTask = (formData) => {
    submit(formData, { method: "post" });
  };
  
  const handleDeleteTask = (id) => {
    if (confirm("Are you sure you want to delete this task?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("id", id);
      submit(formData, { method: "post" });
      
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
    }
  };
  
  const handleToggleComplete = (id, completed) => {
    const formData = new FormData();
    formData.append("_action", "toggle");
    formData.append("id", id);
    formData.append("completed", (!completed).toString());
    submit(formData, { method: "post" });
    
    if (selectedTask?.id === id) {
      setSelectedTask({ ...selectedTask, completed: !completed });
    }
  };
  
  const handleEditRecurringTask = (task, pattern) => {
    setEditingRecurringTask(task);
    setEditingRecurringPattern(pattern);
    setShowRecurringForm(true);
  };
  
  const handleDeleteRecurringTask = (id) => {
    const formData = new FormData();
    formData.append("_action", "delete_recurring");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };
  
  const handleImportTasks = (tasksData) => {
    const formData = new FormData();
    formData.append("_action", "import_tasks");
    formData.append("tasksJson", JSON.stringify(tasksData));
    submit(formData, { method: "post" });
  };
  
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };
  
  const resetFilters = () => {
    setSearchTerm("");
    setFilterCategory("");
    setFilterPriority("");
    setFilterDueDate("");
    setSortBy("dueDate");
    setSortDirection("asc");
  };
  
  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    // First, filter the tasks
    let filtered = [...tasks];
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(lowerSearchTerm) || 
        (task.description && task.description.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    if (filterCategory) {
      filtered = filtered.filter(task => task.category === filterCategory);
    }
    
    if (filterPriority) {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }
    
    if (filterDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        
        switch (filterDueDate) {
          case "today":
            return dueDate >= today && dueDate < tomorrow;
          case "tomorrow":
            return dueDate >= tomorrow && dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
          case "week":
            return dueDate >= today && dueDate < nextWeek;
          case "overdue":
            return dueDate < today;
          default:
            return true;
        }
      });
    }
    
    // Then, sort the filtered tasks
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "priority":
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          comparison = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
          break;
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "category":
          if (!a.category && !b.category) comparison = 0;
          else if (!a.category) comparison = 1;
          else if (!b.category) comparison = -1;
          else comparison = a.category.localeCompare(b.category);
          break;
        case "amount":
          const aAmount = a.amount || 0;
          const bAmount = b.amount || 0;
          comparison = aAmount - bAmount;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [tasks, searchTerm, filterCategory, filterPriority, filterDueDate, sortBy, sortDirection]);
  
  // Filter tasks by completion status
  const pendingTasks = filteredAndSortedTasks.filter(task => !task.completed);
  const completedTasks = filteredAndSortedTasks.filter(task => task.completed);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
          Tasks
        </h1>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setView("list")}
            variant={view === "list" ? "primary" : "outline"}
            size="sm"
          >
            <FiList className="mr-1" />
            List
          </Button>
          
          <Button
            onClick={() => setView("calendar")}
            variant={view === "calendar" ? "primary" : "outline"}
            size="sm"
          >
            <FiCalendar className="mr-1" />
            Calendar
          </Button>
          
          <Button
            onClick={() => {
              setShowRecurringForm(true);
              setEditingRecurringTask(null);
              setEditingRecurringPattern(null);
            }}
            size="sm"
          >
            <FiPlus className="mr-1" />
            <FiRepeat className="mr-1" />
            Recurring
          </Button>

          <Button
            onClick={() => setShowImportModal(true)}
            size="sm"
          >
            <FiUpload className="mr-1" />
            Import
          </Button>
          
          <Button
            onClick={() => {
              setShowTaskForm(true);
              setSelectedTask(null);
            }}
          >
            <FiPlus className="mr-1" />
            Add Task
          </Button>
        </div>
      </div>
      
      {actionData?.error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p>{actionData.error}</p>
        </div>
      )}
      
      {view === "list" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 md:mb-0">
                  All Tasks
                </h2>
                
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full md:w-auto"
                    />
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700" : ""}
                  >
                    <FiFilter className="mr-1" />
                    Filter
                  </Button>
                </div>
              </div>
              
              {showFilters && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md mb-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Due Date
                      </label>
                      <select
                        value={filterDueDate}
                        onChange={(e) => setFilterDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All Dates</option>
                        <option value="today">Today</option>
                        <option value="tomorrow">Tomorrow</option>
                        <option value="week">This Week</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sort By
                      </label>
                      <div className="flex space-x-2">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          <option value="dueDate">Due Date</option>
                          <option value="title">Title</option>
                          <option value="priority">Priority</option>
                          <option value="category">Category</option>
                          <option value="amount">Amount</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleSortDirection}
                          className="px-2"
                        >
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              )}
              
              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <EmptyState
                  title="No tasks found"
                  description={searchTerm || filterCategory || filterPriority || filterDueDate ? 
                    "Try adjusting your filters to see more tasks" : 
                    "Create your first task to get started"}
                  action={() => setShowTaskForm(true)}
                  actionText="Add Task"
                />
              ) : (
                <div className="space-y-4">
                  {pendingTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEdit={() => {
                        setSelectedTask(task);
                        setShowTaskForm(true);
                      }}
                      onDelete={handleDeleteTask}
                      onSelect={() => setSelectedTask(task)}
                      isSelected={selectedTask?.id === task.id}
                      currency={currency}
                    />
                  ))}
                  
                  {completedTasks.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Completed Tasks
                      </h3>
                      <div className="space-y-2 opacity-70">
                        {completedTasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggleComplete={handleToggleComplete}
                            onEdit={() => {
                              setSelectedTask(task);
                              setShowTaskForm(true);
                            }}
                            onDelete={handleDeleteTask}
                            onSelect={() => setSelectedTask(task)}
                            isSelected={selectedTask?.id === task.id}
                            currency={currency}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {recurringTasks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recurring Tasks
                </h2>
                <div className="space-y-4">
                  {recurringTasks.map(({ task, pattern, occurrences }) => (
                    <RecurringTaskItem
                      key={task.id}
                      task={task}
                      pattern={pattern}
                      occurrences={occurrences}
                      onEdit={handleEditRecurringTask}
                      onDelete={handleDeleteRecurringTask}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            {selectedTask ? (
              <TaskDetail
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onEdit={() => setShowTaskForm(true)}
                onDelete={() => handleDeleteTask(selectedTask.id)}
                onToggleComplete={() => handleToggleComplete(selectedTask.id, selectedTask.completed)}
                currency={currency}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Task Details
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Select a task to view its details
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <TaskCalendar
            tasks={tasks}
            onSelectTask={setSelectedTask}
            onAddTask={() => {
              setShowTaskForm(true);
              setSelectedTask(null);
            }}
          />
        </div>
      )}
      
      {showTaskForm && (
        <TaskForm
          task={selectedTask}
          onSubmit={selectedTask ? handleUpdateTask : handleCreateTask}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}
      
      {showRecurringForm && (
        <RecurringTaskForm
          task={editingRecurringTask}
          pattern={editingRecurringPattern}
          onSubmit={handleCreateTask}
          onClose={() => {
            setShowRecurringForm(false);
            setEditingRecurringTask(null);
            setEditingRecurringPattern(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}
      
      {showImportModal && (
        <ImportTasksModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportTasks}
          isImporting={isSubmitting}
        />
      )}
    </div>
  );
}
