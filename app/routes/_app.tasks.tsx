import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

import { requireAuth } from "~/utils/auth";
import { createTask, getUserTasks, updateTask, deleteTask } from "~/models/tasks.server";
import { formatCurrency, formatDate } from "~/utils/formatters";
import Card from "~/components/Card";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Select from "~/components/Select";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth(request);
  const tasks = await getUserTasks(userId);
  
  return json({ tasks });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  
  if (intent === "create") {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dueDateStr = formData.get("dueDate") as string;
    const category = formData.get("category") as string;
    const financialAmountStr = formData.get("financialAmount") as string;
    
    if (!title || !category) {
      return json({ error: "Title and category are required" }, { status: 400 });
    }
    
    const dueDate = dueDateStr ? new Date(dueDateStr) : undefined;
    const financialAmount = financialAmountStr ? parseFloat(financialAmountStr) : undefined;
    
    await createTask(userId, {
      title,
      description,
      dueDate,
      category,
      financialAmount,
    });
    
    return redirect("/tasks");
  }
  
  if (intent === "toggle") {
    const taskId = formData.get("taskId") as string;
    const completed = formData.get("completed") === "true";
    
    await updateTask(taskId, userId, { completed: !completed });
    return json({ success: true });
  }
  
  if (intent === "delete") {
    const taskId = formData.get("taskId") as string;
    
    await deleteTask(taskId, userId);
    return json({ success: true });
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
}

export default function Tasks() {
  const { tasks } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("personal");
  const [financialAmount, setFinancialAmount] = useState("");
  
  const categories = [
    { value: "personal", label: "Personal" },
    { value: "work", label: "Work" },
    { value: "financial", label: "Financial" },
    { value: "investment", label: "Investment" },
    { value: "other", label: "Other" },
  ];
  
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setCategory("personal");
    setFinancialAmount("");
    setShowNewTaskForm(false);
  };
  
  // Group tasks by completion status
  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
  
  // Get today's date in YYYY-MM-DD format for the date picker min value
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your tasks, schedule, and financial to-dos
          </p>
        </div>
        <Button
          variant={showNewTaskForm ? "secondary" : "primary"}
          onClick={() => setShowNewTaskForm(!showNewTaskForm)}
        >
          {showNewTaskForm ? "Cancel" : "New Task"}
        </Button>
      </div>
      
      {showNewTaskForm && (
        <Card title="Create New Task" className="bg-white shadow-md border border-gray-100">
          <Form method="post" className="space-y-5">
            <input type="hidden" name="intent" value="create" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  id="title"
                  name="title"
                  label="Task Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title"
                  required
                  className="mb-0"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about this task"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    min={today}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Select a date from the calendar</p>
              </div>
              
              <div>
                <Select
                  id="category"
                  name="category"
                  label="Category"
                  options={categories}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              
              <div className={category === "financial" || category === "investment" ? "md:col-span-2" : "hidden"}>
                <Input
                  id="financialAmount"
                  name="financialAmount"
                  type="number"
                  label="Financial Amount"
                  value={financialAmount}
                  onChange={(e) => setFinancialAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                  className="mb-0"
                />
              </div>
            </div>
            
            {actionData?.error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {actionData.error}
              </div>
            )}
            
            <div className="flex space-x-4 pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={`Pending Tasks (${pendingTasks.length})`} className="bg-white shadow-md border border-gray-100">
          {pendingTasks.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {pendingTasks.map((task) => (
                <li key={task.id} className="py-4 hover:bg-gray-50 transition-colors rounded-md">
                  <div className="flex items-start">
                    <Form method="post" className="mr-3 mt-1">
                      <input type="hidden" name="intent" value="toggle" />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="completed" value={String(task.completed)} />
                      <button
                        type="submit"
                        className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <span className="sr-only">Toggle completion</span>
                      </button>
                    </Form>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Form>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center text-xs text-gray-500 gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                          {task.category}
                        </span>
                        {task.dueDate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(new Date(task.dueDate))}
                          </span>
                        )}
                        {task.financialAmount && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatCurrency(task.financialAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="mt-2 text-gray-500">No pending tasks</p>
              <Button 
                variant="secondary" 
                className="mt-4"
                onClick={() => setShowNewTaskForm(true)}
              >
                Create a task
              </Button>
            </div>
          )}
        </Card>
        
        <Card title={`Completed Tasks (${completedTasks.length})`} className="bg-white shadow-md border border-gray-100">
          {completedTasks.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {completedTasks.map((task) => (
                <li key={task.id} className="py-4 hover:bg-gray-50 transition-colors rounded-md">
                  <div className="flex items-start">
                    <Form method="post" className="mr-3 mt-1">
                      <input type="hidden" name="intent" value="toggle" />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="completed" value={String(task.completed)} />
                      <button
                        type="submit"
                        className="h-5 w-5 rounded-full bg-blue-500 border-2 border-blue-500 flex items-center justify-center hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </Form>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-500 line-through">{task.title}</p>
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Form>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-400 line-through">{task.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center text-xs text-gray-400 gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {task.category}
                        </span>
                        {task.dueDate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(new Date(task.dueDate))}
                          </span>
                        )}
                        {task.financialAmount && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatCurrency(task.financialAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-gray-500">No completed tasks yet</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
