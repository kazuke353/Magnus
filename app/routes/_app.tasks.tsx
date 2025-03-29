import { useState, useEffect } from "react";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getUserTasks, createTask, updateTask, deleteTask, createBulkTasks } from "~/db/tasks.server";
import { FiPlus, FiCalendar, FiList, FiGrid, FiFilter, FiCheck, FiClock, FiUpload } from "react-icons/fi";
import Button from "~/components/Button";
import Card from "~/components/Card";
import TaskItem from "~/components/TaskItem";
import TaskForm from "~/components/TaskForm";
import TaskDetail from "~/components/TaskDetail";
import TaskCalendar from "~/components/TaskCalendar";
import EmptyState from "~/components/EmptyState";
import ImportTasksModal from "~/components/ImportTasksModal";
import { showToast } from "~/components/ToastContainer";
import { errorResponse } from "~/utils/error-handler";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await requireAuthentication(request, "/login");
    
    let tasks = [];
    try {
      tasks = await getUserTasks(user.id);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      // Return empty tasks array if there's an error
    }
    
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
      try {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string || "";
        const dueDate = formData.get("dueDate") as string || undefined;
        const amount = formData.get("amount") && formData.get("amount") !== "" 
          ? parseFloat(formData.get("amount") as string) 
          : null;
        const category = formData.get("category") as string || undefined;
        const priority = (formData.get("priority") as "low" | "medium" | "high") || "medium";
        
        const task = await createTask({
          userId: user.id,
          title,
          description,
          dueDate,
          amount,
          category,
          priority,
          completed: false
        });
        
        return json({ success: true, task, action: "created" });
      } catch (error) {
        console.error("Error creating task:", error);
        return json({ error: `Failed to create task: ${error.message}` }, { status: 500 });
      }
    }
    
    if (action === "bulk_create") {
      try {
        const tasksText = formData.get("tasks") as string;
        const dueDate = formData.get("dueDate") as string || undefined;
        const category = formData.get("category") as string || undefined;
        const priority = (formData.get("priority") as "low" | "medium" | "high") || "medium";
        const amount = formData.get("amount") && formData.get("amount") !== "" 
          ? parseFloat(formData.get("amount") as string) 
          : null;
        
        // Split tasks by newline and filter out empty lines
        const taskTitles = tasksText.split('\n').filter(title => title.trim() !== '');
        
        const createdTasks = await createBulkTasks(
          user.id,
          taskTitles,
          {
            dueDate,
            category,
            priority,
            amount
          }
        );
        
        return json({ 
          success: true, 
          tasks: createdTasks, 
          action: "bulk_created",
          count: createdTasks.length
        });
      } catch (error) {
        console.error("Error creating bulk tasks:", error);
        return json({ error: `Failed to create bulk tasks: ${error.message}` }, { status: 500 });
      }
    }
    
    if (action === "import_json") {
      try {
        const jsonData = formData.get("jsonData") as string;
        const tasks = JSON.parse(jsonData);
        
        if (!Array.isArray(tasks)) {
          throw new Error("Imported data must be an array of tasks");
        }
        
        const createdTasks = [];
        
        for (const taskData of tasks) {
          const task = await createTask({
            userId: user.id,
            title: taskData.title,
            description: taskData.description || "",
            dueDate: taskData.dueDate,
            amount: taskData.amount || null,
            category: taskData.category,
            priority: taskData.priority || "medium",
            completed: false
          });
          
          createdTasks.push(task);
        }
        
        return json({ 
          success: true, 
          tasks: createdTasks, 
          action: "json_imported",
          count: createdTasks.length
        });
      } catch (error) {
        console.error("Error importing JSON tasks:", error);
        return json({ error: `Failed to import tasks: ${error.message}` }, { status: 500 });
      }
    }
    
    if (action === "update") {
      try {
        const id = formData.get("id") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string || "";
        const dueDate = formData.get("dueDate") as string || undefined;
        const amount = formData.get("amount") && formData.get("amount") !== "" 
          ? parseFloat(formData.get("amount") as string) 
          : null;
        const category = formData.get("category") as string || undefined;
        const priority = (formData.get("priority") as "low" | "medium" | "high") || "medium";
        
        const task = await updateTask(id, {
          title,
          description,
          dueDate,
          amount,
          category,
          priority
        });
        
        return json({ success: true, task, action: "updated" });
      } catch (error) {
        console.error("Error updating task:", error);
        return json({ error: `Failed to update task: ${error.message}` }, { status: 500 });
      }
    }
    
    if (action === "toggle") {
      try {
        const id = formData.get("id") as string;
        const completed = formData.get("completed") === "true";
        
        const task = await updateTask(id, { completed });
        
        return json({ success: true, task, action: "toggled" });
      } catch (error) {
        console.error("Error toggling task completion:", error);
        return json({ error: `Failed to toggle task completion: ${error.message}` }, { status: 500 });
      }
    }
    
    if (action === "delete") {
      try {
        const id = formData.get("id") as string;
        
        await deleteTask(id);
        
        return json({ success: true, id, action: "deleted" });
      } catch (error) {
        console.error("Error deleting task:", error);
        return json({ error: `Failed to delete task: ${error.message}` }, { status: 500 });
      }
    }
    
    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};

type FilterOption = "all" | "today" | "upcoming" | "completed" | "incomplete";

export default function Tasks() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [tasks, setTasks] = useState(loaderData.tasks || []);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  
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
      } else if (actionData.action === "bulk_created") {
        setTasks((prev) => [...prev, ...actionData.tasks]);
        setIsFormOpen(false);
        showToast({
          type: "success",
          message: `${actionData.count} tasks created successfully`,
          duration: 3000
        });
      } else if (actionData.action === "json_imported") {
        setTasks((prev) => [...prev, ...actionData.tasks]);
        setIsImportModalOpen(false);
        showToast({
          type: "success",
          message: `${actionData.count} tasks imported successfully`,
          duration: 3000
        });
      } else if (actionData.action === "updated") {
        setTasks((prev) => prev.map((task) => task.id === actionData.task.id ? actionData.task : task));
        setIsFormOpen(false);
        setEditingTask(null);
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
    } else if (actionData?.error) {
      showToast({
        type: "error",
        message: actionData.error,
        duration: 5000
      });
    }
  }, [actionData]);
  
  const handleCreateTask = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };
  
  const handleEditTask = (task: typeof tasks[0]) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };
  
  const handleToggleComplete = (id: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("_action", "toggle");
    formData.append("id", id);
    formData.append("completed", completed.toString());
    
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
  
  const handleFormSubmit = (formData: FormData) => {
    submit(formData, { method: "post" });
  };
  
  const handleImportTasks = (tasksData: any[]) => {
    const formData = new FormData();
    formData.append("_action", "import_json");
    formData.append("jsonData", JSON.stringify(tasksData));
    
    submit(formData, { method: "post" });
  };
  
  const isSubmitting = navigation.state === "submitting";
  
  // Filter tasks based on selected filter option
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const filteredTasks = tasks.filter(task => {
    if (filterOption === "all") return true;
    if (filterOption === "completed") return task.completed;
    if (filterOption === "incomplete") return !task.completed;
    
    if (filterOption === "today") {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }
    
    if (filterOption === "upcoming") {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() > today.getTime();
    }
    
    return true;
  });
  
  // Get selected task details
  const selectedTaskDetails = selectedTask ? tasks.find(t => t.id === selectedTask) : null;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your to-dos and stay organized</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-1 flex">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-md ${
                viewMode === "list" 
                  ? "bg-white dark:bg-gray-700 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400"
              }`}
              aria-label="List view"
            >
              <FiList className="inline-block" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 rounded-md ${
                viewMode === "calendar" 
                  ? "bg-white dark:bg-gray-700 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400"
              }`}
              aria-label="Calendar view"
            >
              <FiCalendar className="inline-block" />
            </button>
          </div>
          
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <FiUpload className="mr-2" />
            Import
          </Button>
          
          <Button onClick={handleCreateTask}>
            <FiPlus className="mr-2" />
            Add Task
          </Button>
        </div>
      </div>
      
      {viewMode === "list" ? (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant={filterOption === "all" ? "primary" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("all")}
            >
              All
            </Button>
            <Button 
              variant={filterOption === "today" ? "primary" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("today")}
            >
              <FiClock className="mr-1" />
              Today
            </Button>
            <Button 
              variant={filterOption === "upcoming" ? "primary" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("upcoming")}
            >
              <FiCalendar className="mr-1" />
              Upcoming
            </Button>
            <Button 
              variant={filterOption === "incomplete" ? "primary" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("incomplete")}
            >
              <FiFilter className="mr-1" />
              Incomplete
            </Button>
            <Button 
              variant={filterOption === "completed" ? "primary" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("completed")}
            >
              <FiCheck className="mr-1" />
              Completed
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card title={`${filterOption.charAt(0).toUpperCase() + filterOption.slice(1)} Tasks`}>
                {filteredTasks.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onToggleComplete={handleToggleComplete}
                        onSelect={() => setSelectedTask(task.id)}
                        isSelected={selectedTask === task.id}
                        currency={loaderData.user.settings?.currency || "$"}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<FiList className="h-12 w-12" />}
                    title={`No ${filterOption} tasks`}
                    description={`You don't have any ${filterOption} tasks. Add a new task to get started.`}
                    actionLabel="Add Task"
                    onAction={handleCreateTask}
                  />
                )}
              </Card>
            </div>
            
            <div>
              {selectedTaskDetails ? (
                <TaskDetail
                  task={selectedTaskDetails}
                  onClose={() => setSelectedTask(null)}
                  onDelete={handleDeleteTask}
                  onEdit={handleEditTask}
                  onToggleComplete={handleToggleComplete}
                  currency={loaderData.user.settings?.currency || "$"}
                />
              ) : (
                <Card>
                  <EmptyState
                    icon={<FiGrid className="h-12 w-12" />}
                    title="No task selected"
                    description="Select a task to view its details"
                  />
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <TaskCalendar
          tasks={tasks}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          onTaskClick={setSelectedTask}
          onDateClick={() => handleCreateTask()}
          currency={loaderData.user.settings?.currency || "$"}
        />
      )}
      
      {isFormOpen && (
        <TaskForm
          task={editingTask || undefined}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTask(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}
      
      {isImportModalOpen && (
        <ImportTasksModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportTasks}
          isImporting={isSubmitting && navigation.formData?.get("_action") === "import_json"}
        />
      )}
    </div>
  );
}
