import { useState, useEffect } from "react";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getUserTasks, createTask, updateTask, deleteTask } from "~/db/tasks.server";
import { FiPlus, FiCalendar, FiList, FiGrid } from "react-icons/fi";
import Button from "~/components/Button";
import Card from "~/components/Card";
import TaskItem from "~/components/TaskItem";
import TaskForm from "~/components/TaskForm";
import TaskDetail from "~/components/TaskDetail";
import TaskCalendar from "~/components/TaskCalendar";
import EmptyState from "~/components/EmptyState";
import { showToast } from "~/components/ToastContainer";
import { errorResponse } from "~/utils/error-handler";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await requireAuthentication(request, "/login");
    const tasks = await getUserTasks(user.id);
    
    return json({ user, tasks });
  } catch (error) {
    return errorResponse(error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const user = await requireAuthentication(request, "/login");
    const formData = await request.formData();
    const action = formData.get("_action") as string;
    
    if (action === "create") {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const dueDate = formData.get("dueDate") as string;
      const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : null;
      const category = formData.get("category") as string;
      
      const task = await createTask({
        userId: user.id,
        title,
        description,
        dueDate: dueDate || undefined,
        amount,
        category: category || undefined,
        completed: false
      });
      
      return json({ success: true, task, action: "created" });
    }
    
    if (action === "update") {
      const id = formData.get("id") as string;
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const dueDate = formData.get("dueDate") as string;
      const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : null;
      const category = formData.get("category") as string;
      const completed = formData.get("completed") === "true";
      
      const task = await updateTask(id, {
        title,
        description,
        dueDate: dueDate || undefined,
        amount,
        category: category || undefined,
        completed
      });
      
      return json({ success: true, task, action: "updated" });
    }
    
    if (action === "toggle") {
      const id = formData.get("id") as string;
      const completed = formData.get("completed") === "true";
      
      const task = await updateTask(id, { completed });
      
      return json({ success: true, task, action: "toggled" });
    }
    
    if (action === "delete") {
      const id = formData.get("id") as string;
      
      await deleteTask(id);
      
      return json({ success: true, id, action: "deleted" });
    }
    
    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};

export default function Tasks() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [tasks, setTasks] = useState(loaderData.tasks || []);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  // Update tasks when loader data changes
  useEffect(() => {
    if (loaderData.tasks) {
      setTasks(loaderData.tasks);
    }
  }, [loaderData.tasks]);
  
  // Handle action responses
  useEffect(() => {
    if (actionData?.success) {
      // Update local tasks state based on the action
      if (actionData.action === "created") {
        setTasks((prev) => [...prev, actionData.task]);
        setIsFormOpen(false);
        showToast({
          type: "success",
          message: "Task created successfully",
          duration: 3000
        });
      } else if (actionData.action === "updated") {
        setTasks((prev) => prev.map((task) => task.id === actionData.task.id ? actionData.task : task));
        setSelectedTask(null);
        showToast({
          type: "success",
          message: "Task updated successfully",
          duration: 3000
        });
      } else if (actionData.action === "toggled") {
        setTasks((prev) => prev.map((task) => task.id === actionData.task.id ? actionData.task : task));
        showToast({
          type: "success",
          message: `Task marked as ${actionData.task.completed ? "completed" : "incomplete"}`,
          duration: 3000
        });
      } else if (actionData.action === "deleted") {
        setTasks((prev) => prev.filter((task) => task.id !== actionData.id));
        setSelectedTask(null);
        showToast({
          type: "success",
          message: "Task deleted successfully",
          duration: 3000
        });
      }
    }
  }, [actionData]);
  
  const handleToggleComplete = (id: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("_action", "toggle");
    formData.append("id", id);
    formData.append("completed", (!completed).toString());
    
    submit(formData, { method: "post" });
  };
  
  const handleDeleteTask = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("id", id);
      
      submit(formData, { method: "post" });
    }
  };
  
  const isSubmitting = navigation.state === "submitting";
  
  // Filter tasks
  const completedTasks = tasks.filter((task) => task.completed);
  const pendingTasks = tasks.filter((task) => !task.completed);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your financial to-dos and reminders</p>
        </div>
        
        <div className="flex space-x-2">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-1 flex">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-md ${
                viewMode === "list" 
                  ? "bg-white dark:bg-gray-700 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <FiList className="inline-block mr-1" />
              List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 rounded-md ${
                viewMode === "calendar" 
                  ? "bg-white dark:bg-gray-700 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <FiCalendar className="inline-block mr-1" />
              Calendar
            </button>
          </div>
          
          <Button onClick={() => setIsFormOpen(true)}>
            <FiPlus className="mr-2" />
            Add Task
          </Button>
        </div>
      </div>
      
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card title="Pending Tasks">
              {pendingTasks.length > 0 ? (
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={() => handleToggleComplete(task.id, task.completed)}
                      onSelect={() => setSelectedTask(task.id)}
                      isSelected={selectedTask === task.id}
                      currency={loaderData.user.settings.currency}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FiList className="h-6 w-6" />}
                  title="No pending tasks"
                  description="You don't have any pending tasks. Add a new task to get started."
                  actionLabel="Add Task"
                  onAction={() => setIsFormOpen(true)}
                />
              )}
            </Card>
            
            {completedTasks.length > 0 && (
              <Card title="Completed Tasks" className="mt-6">
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={() => handleToggleComplete(task.id, task.completed)}
                      onSelect={() => setSelectedTask(task.id)}
                      isSelected={selectedTask === task.id}
                      currency={loaderData.user.settings.currency}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
          
          <div>
            {selectedTask ? (
              <TaskDetail
                task={tasks.find((t) => t.id === selectedTask)!}
                onClose={() => setSelectedTask(null)}
                onDelete={() => handleDeleteTask(selectedTask)}
                onEdit={() => {
                  // Logic to edit task would go here
                  // For now, just show a toast
                  showToast({
                    type: "info",
                    message: "Edit functionality coming soon",
                    duration: 3000
                  });
                }}
                currency={loaderData.user.settings.currency}
              />
            ) : (
              <Card>
                <EmptyState
                  icon={<FiGrid className="h-6 w-6" />}
                  title="No task selected"
                  description="Select a task to view its details"
                />
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <TaskCalendar
            tasks={tasks}
            onTaskClick={(taskId) => setSelectedTask(taskId)}
            onDateClick={() => setIsFormOpen(true)}
          />
        </Card>
      )}
      
      {isFormOpen && (
        <TaskForm
          onClose={() => setIsFormOpen(false)}
          onSubmit={(formData) => {
            formData.append("_action", "create");
            submit(formData, { method: "post" });
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
