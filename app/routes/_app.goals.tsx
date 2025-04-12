import { useLoaderData, useSubmit, useNavigation, Link, json, useActionData } from "@remix-run/react"; // Import useActionData
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useState, useCallback, useEffect } from "react";
import { requireAuthentication } from "~/services/auth.server";
import { getUserGoals, createGoal, updateGoal, deleteGoal, Goal } from "~/db/goals.server"; // DB functions now enforce ownership
import { getPortfolioData } from "~/services/portfolio.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import GoalTracker from "~/components/GoalTracker";
import GoalModal from "~/components/GoalModal";
import Card from "~/components/Card";
import Button from "~/components/Button";
import { FiPlus, FiTarget } from "react-icons/fi";
import { showToast } from "~/components/ToastContainer";
import { errorResponse, createApiError } from "~/utils/error-handler";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await requireAuthentication(request);

    // getUserGoals already filters by userId
    const goals = await getUserGoals(user.id);

    // Get portfolio data for current value (already uses userId implicitly via API key)
    let portfolioData: PerformanceMetrics | null = null;
    try {
      // Assuming getPortfolioData uses the authenticated user's context or API key
      portfolioData = await getPortfolioData(user.id);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      // Continue without portfolio data
    }

    // Calculate current portfolio value
    let currentPortfolioValue = 0;
    if (portfolioData?.overallSummary?.overallSummary) {
      const { totalInvestedOverall, totalResultOverall } = portfolioData.overallSummary.overallSummary;
      currentPortfolioValue = (totalInvestedOverall || 0) + (totalResultOverall || 0);
    }

    return json({
      user,
      goals,
      currentPortfolioValue,
      portfolioData // Pass portfolioData if needed by the component
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const user = await requireAuthentication(request);
    const formData = await request.formData();
    const actionType = formData.get("_action") as string;

    if (actionType === "create") {
      const goalData = JSON.parse(formData.get("goalData") as string);
      // createGoal already takes userId
      const newGoal = await createGoal(user.id, goalData);
      return json({ success: true, goal: newGoal });
    }

    if (actionType === "update") {
      const goalId = formData.get("goalId") as string;
      const goalData = JSON.parse(formData.get("goalData") as string);
      // updateGoal now requires userId
      const updatedGoal = await updateGoal(goalId, user.id, goalData);
      if (!updatedGoal) { // Handle case where update failed (e.g., goal not found/owned)
         return json({ success: false, error: "Failed to update goal. It might not exist or you don't have permission." }, { status: 404 });
      }
      return json({ success: true, goal: updatedGoal });
    }

    if (actionType === "delete") {
      const goalId = formData.get("goalId") as string;
      // deleteGoal now requires userId
      const deleted = await deleteGoal(goalId, user.id);
       if (!deleted) { // Handle case where delete failed
         return json({ success: false, error: "Failed to delete goal. It might not exist or you don't have permission." }, { status: 404 });
      }
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};

export default function Goals() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>(); // Define actionData here
  const navigation = useNavigation();
  const submit = useSubmit();

  // Handle potential error in loader data
  const { user, goals: initialGoals, currentPortfolioValue, portfolioData, error } = loaderData.error
    ? { user: null, goals: [], currentPortfolioValue: 0, portfolioData: null, error: loaderData.error }
    : { ...loaderData, error: null };

  const [goals, setGoals] = useState<Goal[]>(initialGoals || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);

  // Update goals when loader data changes
  useEffect(() => {
    if (initialGoals) {
      setGoals(initialGoals);
    }
  }, [initialGoals]);

  // Show notification when there's an error
  useEffect(() => {
    if (error) {
      showToast({
        type: "error",
        message: error.message || "An error occurred while loading goals",
        duration: 5000
      });
    }
  }, [error]);

  const handleAddGoal = useCallback(() => {
    setEditingGoal(undefined);
    setIsModalOpen(true);
  }, []);

  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  }, []);

  const handleSaveGoal = useCallback((goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'currency'>) => { // Exclude userId/currency as they are handled server-side
    const formData = new FormData();

    if (editingGoal) {
      // Update existing goal
      formData.append("_action", "update");
      formData.append("goalId", editingGoal.id);
      formData.append("goalData", JSON.stringify(goalData));

      submit(formData, { method: "post" });

      showToast({
        type: "info",
        message: "Updating goal...",
        duration: 2000
      });
    } else {
      // Create new goal
      formData.append("_action", "create");
      formData.append("goalData", JSON.stringify(goalData));

      submit(formData, { method: "post" });

      showToast({
        type: "info",
        message: "Creating new goal...",
        duration: 2000
      });
    }

    setIsModalOpen(false);
  }, [submit, editingGoal]);

  const handleDeleteGoal = useCallback((goalId: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("goalId", goalId);

      submit(formData, { method: "post" });

      showToast({
        type: "info",
        message: "Deleting goal...",
        duration: 2000
      });
    }
  }, [submit]);

  // Handle action responses (including potential errors from action)
  useEffect(() => {
    // Use optional chaining for actionData
    if (navigation.state === "idle" && navigation.formData && actionData) {
      const actionType = navigation.formData.get("_action");

      if (actionData.error) {
         showToast({
            type: "error",
            message: actionData.error,
            duration: 4000
         });
      } else if (actionData.success) {
          if (actionType === "create") {
            showToast({ type: "success", message: "Goal created successfully!", duration: 3000 });
            // Optionally update local state if action returns the new goal
            if (actionData.goal) setGoals(prev => [...prev, actionData.goal]);
          } else if (actionType === "update") {
            showToast({ type: "success", message: "Goal updated successfully!", duration: 3000 });
             // Optionally update local state if action returns the updated goal
            if (actionData.goal) setGoals(prev => prev.map(g => g.id === actionData.goal.id ? actionData.goal : g));
          } else if (actionType === "delete") {
            showToast({ type: "success", message: "Goal deleted successfully!", duration: 3000 });
             // Update local state
             const deletedId = navigation.formData.get("goalId");
             if (deletedId) setGoals(prev => prev.filter(g => g.id !== deletedId));
          }
      }
    }
  }, [navigation.state, navigation.formData, actionData]); // Depend on actionData

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <div className="text-center p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please log in to view your financial goals.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Financial Goals
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Track your progress towards your financial dreams.
          </p>
        </div>

        <Button onClick={handleAddGoal}>
          <FiPlus className="mr-2" />
          Add New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="text-center p-8">
          <FiTarget className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Financial Goals Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Setting financial goals helps you stay motivated and track your progress towards your dreams.
            Create your first goal to get started!
          </p>
          <Button onClick={handleAddGoal}>
            <FiPlus className="mr-2" />
            Create Your First Goal
          </Button>
        </Card>
      ) : (
        <GoalTracker
          goals={goals}
          currentPortfolioValue={currentPortfolioValue}
          currency={user.settings.currency}
          onAddGoal={handleAddGoal}
          onEditGoal={handleEditGoal}
          // Pass handleDeleteGoal to GoalTracker if it has delete buttons
          // onDeleteGoal={handleDeleteGoal}
        />
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGoal}
        goal={editingGoal}
        currentPortfolioValue={currentPortfolioValue}
        currency={user.settings.currency}
      />
    </div>
  );
}
