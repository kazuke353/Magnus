import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { createTask, deleteTask, getUserTasks, updateTask } from "~/db/tasks.server";
import { Task } from "~/db/schema";
import { useState } from "react";
import Card from "~/components/Card";
import Button from "~/components/Button";
import TaskItem from "~/components/TaskItem";
import TaskForm from "~/components/TaskForm";
import { FiPlus, FiFilter, FiCalendar, FiList } from "react-icons/fi";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthentication(request, "/login");
  
  const tasks = await getUserTasks(user.id);
  
  return json({ user, tasks });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuthentication(request, "/login");
  
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  
  try {
    if (action === "create") {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const dueDate = formData.get("dueDate") as string;
      const category = formData.get("category") as string;
      const priority = formData.get("priority") as string;
      const amountStr = formData.get("amount") as string;
      
      const taskData = {
        title,
        description: description || null,
        dueDate: dueDate || null,
        category: category || null,
        priority: priority as "low" | "medium" | "high",
        amount: amountStr ? parseFloat(amountStr) : null,
      };
      
      const task = await createTask(user.id, taskData);
      return json({ success: true, task });
    }
    
    if (action === "update") {
      const taskId = formData.get("taskId") as string;
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const dueDate = formData.get("dueDate") as string;
      const category = formData.get("category") as string;
      const priority = formData.get("priority") as string;
      const amountStr = formData.get("amount") as string;
      
      const taskData = {
        title,
        description: description || null,
        dueDate: dueDate || null,
        category: category || null,
        priority: priority as "low" | "medium" | "high",
        amount: amountStr ? parseFloat(amountStr) : null,
      };
      
      const task = await updateTask(taskId, taskData);
      return json({ success: true, task });
    }
    
    if (action === "delete") {
      const taskId = formData.get("taskId") as string;
      await deleteTask(taskId);
      return json({ success: true });
    }
    
    if (action === "toggle") {
      const taskId = formData.get("taskId") as string;
      const completed = formData.get("completed") === "true";
      
      const task = await updateTask(taskId, { completed });
      return json({ success: true, task });
    }
    
    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
}

export default function Tasks() {
  const { user, tasks } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  
  const handleCreateTask = (taskData: Partial<Task>) => {
    const formData = new FormData();
    formData.append("_action", "create");
    formData.append("title", taskData.title || "");
    formData.append("description", taskData.description || "");
    formData.append("dueDate", taskData.dueDate || "");
    formData.append("category", taskData.category || "");
    formData.append("priority", taskData.priority || "medium");
    formData.append("amount", taskData.amount?.toString() || "");
    
    submit(formData, { method: "post" });
    setShowForm(false);
  };
  
  const handleUpdateTask = (taskData: Partial<Task>) => {
    if (!editingTask) return;
    
    const formData = new FormData();
    formData.append("_action", "update");
    formData.append("taskId", editingTask.id);
    formData.append("title", taskData.title || "");
    formData.append("description", taskData.description || "");
    formData.append("dueDate", taskData.dueDate || "");
    formData.append("category", taskData.category || "");
    formData.append("priority", taskData.priority || "medium");
    formData.append("amount", taskData.amount?.toString() || "");
    
    submit(formData, { method: "post" });
    setEditingTask(null);
  };
  
  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("taskId", taskId);
      
      submit(formData, { method: "post" });
    }
  };
  
  const handleToggleComplete = (taskId: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("_action", "toggle");
    formData.append("taskId", taskId);
    formData.append("completed", completed.toString());
    
    submit(formData, { method: "post" });
  };
  
  const filteredTasks = tasks.filter(task => {
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks & Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your tasks, schedule, and financial commitments.</p>
        </div>
        
        <Button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
        >
          <FiPlus className="mr-2" />
          Add Task
        </Button>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            } border border-gray-300 dark:border-gray-600`}
          >
            <FiList className="inline-block mr-1" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              viewMode === "calendar"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            } border border-gray-300 dark:border-gray-600 border-l-0`}
          >
            <FiCalendar className="inline-block mr-1" />
            Calendar
          </button>
        </div>
        
        <div className="flex items-center">
          <span className="mr-2 text-gray-700 dark:text-gray-300">
            <FiFilter className="inline-block mr-1" />
            Filter:
          </span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      
      {/* Task form */}
      {showForm && (
        <Card title={editingTask ? "Edit Task" : "Create Task"}>
          <TaskForm
            task={editingTask || undefined}
            onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
            onCancel={() => {
              setShowForm(false);
              setEditingTask(null);
            }}
          />
        </Card>
      )}
      
      {/* Tasks list */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={(task) => {
                  setEditingTask(task);
                  setShowForm(true);
                }}
                onDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ))
          ) : (
            <Card>
              <div className="text-center py-6">
                <p className="text-gray-500 dark:text-gray-400">No tasks found.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setEditingTask(null);
                    setShowForm(true);
                  }}
                >
                  <FiPlus className="mr-2" />
                  Create your first task
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
      
      {/* Calendar view */}
      {viewMode === "calendar" && (
        <Card>
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400">Calendar view is coming soon!</p>
          </div>
        </Card>
      )}
    </div>
  );
}
