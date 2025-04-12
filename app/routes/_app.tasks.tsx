import { useState, useEffect, useMemo } from "react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useNavigation, Form } from "@remix-run/react"; // Import Form
import { FiPlus, FiUpload, FiRepeat, FiFilter, FiSearch, FiList, FiX } from "react-icons/fi";
import { isSameDay, parseISO, isValid } from 'date-fns';
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
import { formatDate, getCurrentDateForInput, formatDateWithDay } from "~/utils/date";
import ImportTasksModal from "~/components/ImportTasksModal";
import RecurringTaskForm from "~/components/RecurringTaskForm";
import RecurringTaskItem from "~/components/RecurringTaskItem";
import { Task, RecurringPattern } from "~/db/schema";
import { db } from "~/db/database.server";
import { eq } from "drizzle-orm";
import { tasks } from "~/db/schema";
import Input from "~/components/Input";
import Select from "~/components/Select";
import { z } from "zod";
import { errorResponse } from "~/utils/error-handler";
import Card from "~/components/Card";

// --- Zod Schemas remain the same ---
const RecurringSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().positive().optional().default(1),
  daysOfWeek: z.string().regex(/^(\d,?)*$/, "Days of week must be comma-separated numbers (1-7)").optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  monthOfYear: z.number().int().min(1).max(12).optional().nullable(),
  occurrences: z.number().int().positive().optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD").optional().nullable(),
}).strict();

const ImportTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD").optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  category: z.string().optional().default(""),
  amount: z.number().optional().nullable(),
  recurring: RecurringSchema.optional(),
}).strict();

const ImportTasksArraySchema = z.array(ImportTaskSchema);
// --- End Zod Schemas ---

// --- Helper function remains the same ---
const stripCodeBlocks = (text: string | null): string => {
  if (!text) return "";
  return text.replace(/```(?:[a-zA-Z0-9]*\n)?(.*?)```/gs, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
};

// --- Loader ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await requireAuthentication(request);
    const userId = user.id;
    const userDetails = await getUserById(userId);
    // Pass the currency CODE directly, default to 'USD' if not set
    const currency = userDetails?.settings?.currency || 'USD';
    const userTasks = await getUserTasks(userId);
    const recurringTasks = await getRecurringTasksForUser(userId);
    const recurringTasksWithOccurrences = await Promise.all(
      recurringTasks.map(async (task) => {
        const pattern = task.recurringPatternId
          ? await getRecurringPatternById(task.recurringPatternId, userId)
          : null;
        const occurrences = task.id
          ? await getTaskOccurrences(task.id, userId)
          : [];
        return { task, pattern, occurrences };
      })
    );
    // Combine regular tasks and occurrences for the initial list/calendar view
    const allDisplayTasks = [
      ...userTasks.filter(task => !task.isRecurring || task.parentTaskId), // Regular tasks + occurrences
      ...recurringTasksWithOccurrences.flatMap(rt => rt.occurrences) // Add occurrences again (might cause duplicates if not careful, but TaskCalendar needs them)
    ];
    // Deduplicate tasks based on ID
    const uniqueTasks = Array.from(new Map(allDisplayTasks.map(task => [task.id, task])).values());

    const categories = [...new Set(uniqueTasks.filter(task => task.category).map(task => task.category))].filter(Boolean) as string[];

    return json({
      tasks: uniqueTasks, // Send all tasks (regular + occurrences)
      recurringTasks: recurringTasksWithOccurrences, // Send parent recurring tasks separately
      categories,
      currency // Pass the currency code
    });
  } catch (error) {
    return errorResponse(error);
  }
};

// --- Action remains the same ---
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const user = await requireAuthentication(request);
    const userId = user.id;
    const formData = await request.formData();
    const action = formData.get("_action");

    switch (action) {
      case "create": {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const dueDate = formData.get("dueDate") as string;
        const category = formData.get("category") as string;
        const priority = formData.get("priority") as "low" | "medium" | "high";
        const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : null;

        if (!title) {
          return json({ error: "Title is required" }, { status: 400 });
        }
        const task = await createTask({ userId, title, description, dueDate, category, priority, amount, completed: false, isRecurring: false, recurringPatternId: null, parentTaskId: null });
        return json({ task });
      }
      case "update": {
        const id = formData.get("id") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const dueDate = formData.get("dueDate") as string;
        const category = formData.get("category") as string;
        const priority = formData.get("priority") as "low" | "medium" | "high";
        const completed = formData.get("completed") === "true";
        const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : null;

        if (!id || !title) {
          return json({ error: "ID and title are required" }, { status: 400 });
        }
        const task = await updateTask(id, userId, { title, description, dueDate, category, priority, completed, amount });
        return json({ task });
      }
      case "delete": {
        const id = formData.get("id") as string;
        if (!id) return json({ error: "ID is required" }, { status: 400 });
        await deleteTask(id, userId);
        return json({ success: true });
      }
      case "toggle": {
        const id = formData.get("id") as string;
        const completed = formData.get("completed") === "true";
        if (!id) return json({ error: "ID is required" }, { status: 400 });
        const task = await updateTask(id, userId, { completed });
        return json({ task });
      }
      case "bulk_create": {
        const titles = (formData.get("titles") as string)?.split("\n").filter(Boolean) || [];
        const dueDate = formData.get("dueDate") as string || null;
        const category = formData.get("category") as string || null;
        const priority = formData.get("priority") as "low" | "medium" | "high" || "medium";
        if (titles.length === 0) return json({ error: "At least one task title is required" }, { status: 400 });
        const tasks = await createBulkTasks(userId, titles, { dueDate, category, priority });
        return json({ tasks });
      }
      case "create_recurring": {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const dueDate = formData.get("dueDate") as string;
        const category = formData.get("category") as string;
        const priority = formData.get("priority") as "low" | "medium" | "high";
        const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : null;
        const frequency = formData.get("frequency") as "daily" | "weekly" | "monthly" | "yearly";
        const interval = parseInt(formData.get("interval") as string || "1");
        const daysOfWeek = formData.get("daysOfWeek") as string || null;
        const dayOfMonth = formData.get("dayOfMonth") ? parseInt(formData.get("dayOfMonth") as string) : null;
        const monthOfYear = formData.get("monthOfYear") ? parseInt(formData.get("monthOfYear") as string) : null;
        const occurrences = formData.get("occurrences") ? parseInt(formData.get("occurrences") as string) : null;
        const endDate = formData.get("endDate") as string || null;
        if (!title || !frequency) return json({ error: "Title and frequency are required" }, { status: 400 });
        const { task, pattern } = await createRecurringTask({ userId, title, description, dueDate, category, priority, amount, completed: false }, { userId, frequency, interval, daysOfWeek, dayOfMonth, monthOfYear, occurrences, endDate });
        return json({ task, pattern });
      }
      case "update_recurring": {
        const id = formData.get("id") as string;
        const patternId = formData.get("patternId") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const dueDate = formData.get("dueDate") as string;
        const category = formData.get("category") as string;
        const priority = formData.get("priority") as "low" | "medium" | "high";
        const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : null;
        const frequency = formData.get("frequency") as "daily" | "weekly" | "monthly" | "yearly";
        const interval = parseInt(formData.get("interval") as string || "1");
        const daysOfWeek = formData.get("daysOfWeek") as string || null;
        const dayOfMonth = formData.get("dayOfMonth") ? parseInt(formData.get("dayOfMonth") as string) : null;
        const monthOfYear = formData.get("monthOfYear") ? parseInt(formData.get("monthOfYear") as string) : null;
        const occurrences = formData.get("occurrences") ? parseInt(formData.get("occurrences") as string) : null;
        const endDate = formData.get("endDate") as string || null;
        if (!id || !patternId || !title || !frequency) return json({ error: "ID, pattern ID, title, and frequency are required" }, { status: 400 });
        const task = await updateTask(id, userId, { title, description, dueDate, category, priority, amount });
        const pattern = await updateRecurringPattern(patternId, userId, { frequency, interval, daysOfWeek, dayOfMonth, monthOfYear, occurrences, endDate });
        return json({ task, pattern });
      }
      case "delete_recurring": {
        const id = formData.get("id") as string;
        if (!id) return json({ error: "ID is required" }, { status: 400 });
        const task = await getTaskById(id, userId);
        if (task && task.recurringPatternId) {
          await deleteRecurringPattern(task.recurringPatternId, userId);
        }
        await deleteTask(id, userId);
        return json({ success: true });
      }
      case "import_tasks": {
        const tasksJson = formData.get("tasksJson") as string | null;
        if (!tasksJson) return json({ error: "No task data provided" }, { status: 400 });
        try {
          const cleanedJson = stripCodeBlocks(tasksJson);
          const rawTasksData = JSON.parse(cleanedJson);
          const validationResult = ImportTasksArraySchema.safeParse(rawTasksData);
          if (!validationResult.success) {
            const formattedErrors = validationResult.error.errors.map(err => `${err.path.join('.') ? `Field '${err.path.join('.')}': ` : ''}${err.message}`).join('\n');
            console.error("Task Import Validation Error:", validationResult.error.flatten());
            return json({ error: `Invalid task data format:\n${formattedErrors}` }, { status: 400 });
          }
          const tasksData = validationResult.data;
          const createdTasks = [];
          for (const taskData of tasksData) {
            if (taskData.recurring) {
              try {
                const { frequency, interval, daysOfWeek, dayOfMonth, monthOfYear, occurrences, endDate } = taskData.recurring;
                const { task } = await createRecurringTask({ userId, title: taskData.title, description: taskData.description, dueDate: taskData.dueDate || getCurrentDateForInput(), category: taskData.category, priority: taskData.priority, amount: taskData.amount, completed: false }, { userId, frequency, interval, daysOfWeek, dayOfMonth, monthOfYear, occurrences, endDate });
                createdTasks.push(task);
              } catch (error: any) {
                console.error("Error importing recurring task:", error);
                return json({ error: `Error importing recurring task "${taskData.title}": ${error.message}` }, { status: 500 });
              }
            } else {
              const task = await createTask({ userId, title: taskData.title, description: taskData.description, dueDate: taskData.dueDate, category: taskData.category, priority: taskData.priority, amount: taskData.amount, completed: false, isRecurring: false, recurringPatternId: null, parentTaskId: null });
              createdTasks.push(task);
            }
          }
          return json({ success: true, tasksCreated: createdTasks.length });
        } catch (error: any) {
          if (error instanceof SyntaxError) {
            console.error("Error parsing JSON tasks:", error);
            return json({ error: `Failed to parse JSON: ${error.message}` }, { status: 400 });
          }
          console.error("Error importing tasks:", error);
          return json({ error: `Failed to import tasks: ${error.message}` }, { status: 500 });
        }
      }
      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return errorResponse(error);
  }
};

// --- Component ---
export default function TasksPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const { tasks: allTasks, recurringTasks, categories, currency, error: loaderError } = loaderData.error
    ? { tasks: [], recurringTasks: [], categories: [], currency: 'USD', error: loaderData.error } // Default currency code
    : { ...loaderData, error: null };

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurringTask, setEditingRecurringTask] = useState<Task | null>(null);
  const [editingRecurringPattern, setEditingRecurringPattern] = useState<RecurringPattern | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // State for selected calendar date

  // Filtering and sorting state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  // Removed filterDueDate state as it's now handled by selectedDate
  const [sortBy, setSortBy] = useState<keyof Task | "amount">("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  // --- useEffect hooks remain the same ---
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

  // --- Event handlers ---
  const handleCreateTask = (formData: FormData) => { submit(formData, { method: "post" }); };
  const handleUpdateTask = (formData: FormData) => { submit(formData, { method: "post" }); };

  // Use submit directly for delete/toggle actions
  const handleDeleteTask = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("id", id);
      submit(formData, { method: "post", replace: true }); // Use replace to avoid history stack buildup
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };
  const handleToggleComplete = (id: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("_action", "toggle");
    formData.append("id", id);
    formData.append("completed", (!completed).toString());
    submit(formData, { method: "post", replace: true }); // Use replace
    if (selectedTask?.id === id) setSelectedTask(prev => prev ? { ...prev, completed: !completed } : null);
  };

  // Edit/Delete Recurring handlers remain the same
  const handleEditRecurringTask = (task: Task, pattern: RecurringPattern) => {
    setEditingRecurringTask(task);
    setEditingRecurringPattern(pattern);
    setShowRecurringForm(true);
  };
  const handleDeleteRecurringTask = (id: string) => {
    if (confirm("Are you sure you want to delete this recurring task and all its future occurrences?")) {
      const formData = new FormData();
      formData.append("_action", "delete_recurring");
      formData.append("id", id);
      submit(formData, { method: "post", replace: true }); // Use replace
    }
  };
  const handleImportTasks = (tasksData: any[]) => {
    const formData = new FormData();
    formData.append("_action", "import_tasks");
    formData.append("tasksJson", JSON.stringify(tasksData));
    submit(formData, { method: "post" });
  };
  const toggleSortDirection = () => { setSortDirection(sortDirection === "asc" ? "desc" : "asc"); };
  const resetFilters = () => {
    setSearchTerm("");
    setFilterCategory("");
    setFilterPriority("");
    // Don't reset selectedDate here, allow user to clear it manually
    setSortBy("dueDate");
    setSortDirection("asc");
  };

  // --- Filter and Sort Logic remains the same ---
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...(allTasks || [])]; // Start with all tasks

    // 1. Filter by selected date (if any)
    if (selectedDate) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        try {
          const taskDate = parseISO(task.dueDate);
          return isValid(taskDate) && isSameDay(taskDate, selectedDate);
        } catch { return false; }
      });
    }

    // 2. Apply other filters to the date-filtered list
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(lowerSearchTerm) ||
        (task.description && task.description.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (filterCategory) filtered = filtered.filter(task => task.category === filterCategory);
    if (filterPriority) filtered = filtered.filter(task => task.priority === filterPriority);

    // 3. Sort the final filtered list
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "title": comparison = a.title.localeCompare(b.title); break;
        case "priority":
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          comparison = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3); break;
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1; else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); break;
        case "category":
          if (!a.category && !b.category) comparison = 0;
          else if (!a.category) comparison = 1; else if (!b.category) comparison = -1;
          else comparison = a.category.localeCompare(b.category); break;
        case "amount":
          const aAmount = a.amount || 0; const bAmount = b.amount || 0;
          comparison = aAmount - bAmount; break;
        default: comparison = 0;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [allTasks, selectedDate, searchTerm, filterCategory, filterPriority, sortBy, sortDirection]);

  const pendingTasks = filteredAndSortedTasks.filter(task => !task.completed);
  const completedTasks = filteredAndSortedTasks.filter(task => task.completed);

  // --- Render error state remains the same ---
  if (loaderError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-red-600 dark:text-red-400">Error Loading Tasks</h1>
        <p className="p-4 text-red-700 dark:text-red-300">{loaderError.message}</p>
        {loaderError.details && <pre className="p-4 bg-red-50 dark:bg-red-900/20 text-xs overflow-auto">{JSON.stringify(loaderError.details, null, 2)}</pre>}
      </div>
    )
  }

  // --- Updated JSX Layout ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
          Tasks
        </h1>
        <div className="flex flex-wrap gap-2">
          {/* Removed view toggle buttons */}
          <Button onClick={() => { setShowRecurringForm(true); setEditingRecurringTask(null); setEditingRecurringPattern(null); }} size="sm">
            <FiPlus className="mr-1" /><FiRepeat className="mr-1" /> Recurring
          </Button>
          <Button onClick={() => setShowImportModal(true)} size="sm">
            <FiUpload className="mr-1" /> Import
          </Button>
          <Button onClick={() => { setShowTaskForm(true); setSelectedTask(null); }}>
            <FiPlus className="mr-1" /> Add Task
          </Button>
        </div>
      </div>

      {/* Action Error Display */}
      {actionData?.error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p className="whitespace-pre-wrap">{actionData.error}</p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Calendar) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4"> {/* Make calendar sticky on large screens */}
            <TaskCalendar
              tasks={allTasks} // Pass all tasks for calendar display
              recurringTasks={recurringTasks.map(rt => rt.task)} // Pass parent recurring tasks
              onDateClick={(date) => {
                setSelectedDate(date);
                setSelectedTask(null); // Clear selected task when changing date
              }}
              onTaskClick={(taskId) => {
                const task = allTasks.find(t => t.id === taskId);
                if (task) {
                  setSelectedTask(task);
                  // Optionally set selectedDate if task has a due date
                  if (task.dueDate) {
                    try {
                      const taskDate = parseISO(task.dueDate);
                      if (isValid(taskDate)) setSelectedDate(taskDate);
                    } catch { }
                  }
                }
              }}
              selectedDate={selectedDate} // Pass selected date to highlight
              currency={currency} // Pass currency code
            />
          </Card>
        </div>

        {/* Right Column (Task List & Details) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task List Section */}
          <Card>
            <div className="p-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 md:mb-0">
                  {selectedDate ? `Tasks for ${formatDateWithDay(selectedDate.toISOString())}` : "All Tasks"}
                  {selectedDate && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="ml-2 text-red-500 hover:text-red-700">
                      <FiX className="mr-1" /> Clear Date
                    </Button>
                  )}
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
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700" : ""}>
                    <FiFilter className="mr-1" /> Filter
                  </Button>
                </div>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md mb-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Adjusted grid */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        <option value="">All Categories</option>
                        {categories.map((category) => (<option key={category} value={category}>{category}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                      <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        <option value="">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    {/* Removed Due Date filter dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                      <div className="flex space-x-2">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as keyof Task | "amount")} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                          <option value="dueDate">Due Date</option>
                          <option value="title">Title</option>
                          <option value="priority">Priority</option>
                          <option value="category">Category</option>
                          <option value="amount">Amount</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={toggleSortDirection} className="px-2">{sortDirection === "asc" ? "↑" : "↓"}</Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filters</Button>
                  </div>
                </div>
              )}

              {/* Task List */}
              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <EmptyState
                  icon={<FiList className="h-12 w-12" />}
                  title={selectedDate ? "No tasks for this date" : "No tasks found"}
                  description={searchTerm || filterCategory || filterPriority ? "Try adjusting your filters" : selectedDate ? "No tasks match the selected date" : "Create your first task"}
                  action={() => setShowTaskForm(true)}
                  actionText="Add Task"
                />
              ) : (
                <div className="space-y-4">
                  {pendingTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete} // Pass correct handler
                      onEdit={() => { setSelectedTask(task); setShowTaskForm(true); }} // Pass correct handler
                      onDelete={handleDeleteTask} // Pass correct handler
                      onSelect={() => setSelectedTask(task)}
                      isSelected={selectedTask?.id === task.id}
                      currency={currency} // Pass currency code
                    />
                  ))}
                  {completedTasks.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Completed Tasks</h3>
                      <div className="space-y-2 opacity-70">
                        {completedTasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggleComplete={handleToggleComplete} // Pass correct handler
                            onEdit={() => { setSelectedTask(task); setShowTaskForm(true); }} // Pass correct handler
                            onDelete={handleDeleteTask} // Pass correct handler
                            onSelect={() => setSelectedTask(task)}
                            isSelected={selectedTask?.id === task.id}
                            currency={currency} // Pass currency code
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Recurring Tasks List (Always visible below the main list) */}
          {recurringTasks.length > 0 && (
            <Card title="Recurring Task Templates">
              <div className="p-4 space-y-4">
                {recurringTasks.map(({ task, pattern, occurrences }) => (
                  <RecurringTaskItem key={task.id} task={task} pattern={pattern} occurrences={occurrences} onEdit={handleEditRecurringTask} onDelete={handleDeleteRecurringTask} currency={currency} />
                ))}
              </div>
            </Card>
          )}

          {/* Task Detail (Only shown when a task is selected) */}
          {selectedTask && (
            <Card className="sticky top-4"> {/* Make details sticky if needed */}
              <TaskDetail
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onEdit={() => setShowTaskForm(true)} // Pass correct handler
                onDelete={() => handleDeleteTask(selectedTask.id)} // Pass correct handler
                onToggleComplete={() => handleToggleComplete(selectedTask.id, selectedTask.completed)} // Pass correct handler
                currency={currency} // Pass currency code
              />
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTaskForm && (
        <TaskForm task={selectedTask} onSubmit={selectedTask ? handleUpdateTask : handleCreateTask} onClose={() => { setShowTaskForm(false); setSelectedTask(null); }} isSubmitting={isSubmitting} />
      )}
      {showRecurringForm && (
        <RecurringTaskForm task={editingRecurringTask} pattern={editingRecurringPattern} onSubmit={editingRecurringTask ? handleUpdateTask : handleCreateTask} onClose={() => { setShowRecurringForm(false); setEditingRecurringTask(null); setEditingRecurringPattern(null); }} isSubmitting={isSubmitting} />
      )}
      {showImportModal && (
        <ImportTasksModal onClose={() => setShowImportModal(false)} onImport={handleImportTasks} isImporting={isSubmitting && navigation.formData?.get("_action") === "import_tasks"} />
      )}
    </div>
  );
}
