import { useLoaderData, Link } from "@remix-run/react";
import { useMemo, useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getUserTasks, Task } from "~/db/tasks.server";
import { getUserGoals, Goal } from "~/db/goals.server";
import { getPortfolioData, savePortfolioData } from "~/services/portfolio.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import Card from "~/components/Card";
import DashboardSkeleton from "~/components/DashboardSkeleton";
import PortfolioSummary from "~/components/PortfolioSummary";
import GoalTracker from "~/components/GoalTracker";
import ChatPromo from "~/components/ChatPromo";
import { showToast } from "~/components/ToastContainer";
import { FiCalendar, FiDollarSign, FiTarget } from "react-icons/fi";
import { formatDate } from "~/utils/date";
import { errorResponse, createApiError } from "~/utils/error-handler";
import { useNavigation } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // This will redirect to login if not authenticated
    const user = await requireAuthentication(request, "/login");
    
    if (!user) {
      // This should not happen due to requireAuthentication, but just in case
      return json({
        error: "Authentication required",
        user: null,
        upcomingTasks: [],
        goals: [],
        portfolioData: null,
      });
    }

    // Get upcoming tasks
    let upcomingTasks: Task[] = [];
    try {
      const tasks = await getUserTasks(user.id);
      upcomingTasks = tasks
        .filter(task => !task.completed && task.dueDate)
        .sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
        .slice(0, 5);
    } catch (taskError) {
      console.error("Error fetching tasks:", taskError);
      // Continue with empty tasks
    }

    // Get user's goals - with error handling
    let goals: Goal[] = [];
    try {
      goals = await getUserGoals(user.id);
    } catch (goalError) {
      console.error("Error fetching goals:", goalError);
      // Continue with empty goals
    }
    
    // Get portfolio data
    let portfolioData: PerformanceMetrics | null = null;
    
    try {
      // First try to get cached data
      const cachedData = await getPortfolioData(user.id);

      if (cachedData) {
        portfolioData = cachedData;
      } else {
        // If no cached data, fetch fresh data
        portfolioData = await getPortfolioData(user.settings.monthlyBudget, user.settings.country);

        if (portfolioData) {
          await savePortfolioData(user.id, portfolioData);
        }
      }
    } catch (loadError) {
      console.error("Error loading portfolio data in loader:", loadError);
      // Continue with null portfolio data
    }

    return json({
      user,
      upcomingTasks,
      goals,
      portfolioData,
    }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } });
  } catch (error) {
    return errorResponse(error);
  }
};

interface DashboardLoaderData {
  user: Awaited<ReturnType<typeof requireAuthentication>>;
  upcomingTasks: Task[];
  goals: Goal[];
  portfolioData: PerformanceMetrics | null;
  error?: any;
}

export default function Dashboard() {
  const loaderData = useLoaderData<DashboardLoaderData>();
  const navigation = useNavigation();
  
  // Handle potential error in loader data
  const { user, upcomingTasks, goals, portfolioData, error } = loaderData.error
    ? { ...loaderData, user: null, upcomingTasks: [], goals: [], portfolioData: null, error: loaderData.error }
    : { ...loaderData, error: null };

  // Show notification when there's an error
  useEffect(() => {
    if (error) {
      showToast({
        type: "error",
        message: error.message || "An error occurred while loading dashboard data",
        duration: 5000
      });
    }
  }, [error]);
  
  // Show skeleton loader during initial data fetch
  if (navigation.state === "loading") {
    return <DashboardSkeleton />;
  }

  // Memoize portfolio metrics to avoid recalculations
  const portfolioSummaryData = useMemo(() => {
    if (!portfolioData || !portfolioData.overallSummary || !portfolioData.overallSummary.overallSummary) {
      return null;
    }

    return {
      totalInvested: portfolioData.overallSummary.overallSummary.totalInvestedOverall || 0,
      totalResult: portfolioData.overallSummary.overallSummary.totalResultOverall || 0,
      returnPercentage: portfolioData.overallSummary.overallSummary.returnPercentageOverall || 0,
      fetchDate: portfolioData.overallSummary.overallSummary.fetchDate || new Date().toISOString(),
      estimatedAnnualDividend: portfolioData.allocationAnalysis?.estimatedAnnualDividend || 0
    };
  }, [portfolioData]);

  // Calculate current portfolio value
  const currentPortfolioValue = useMemo(() => {
    if (!portfolioSummaryData) return 0;
    return portfolioSummaryData.totalInvested + portfolioSummaryData.totalResult;
  }, [portfolioSummaryData]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <div className="text-center p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please log in to view your dashboard.
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome, {user.firstName} {user.lastName}!</h1>
        <p className="text-gray-600 dark:text-gray-400">Here's an overview of your financial portfolio and upcoming tasks.</p>
      </div>

      {/* Portfolio Summary - Using the reusable component */}
      {portfolioSummaryData && (
        <PortfolioSummary
          totalInvested={portfolioSummaryData.totalInvested}
          totalResult={portfolioSummaryData.totalResult}
          returnPercentage={portfolioSummaryData.returnPercentage}
          fetchDate={portfolioSummaryData.fetchDate}
          estimatedAnnualDividend={portfolioSummaryData.estimatedAnnualDividend}
          currency={user.settings.currency}
          compact={true}
        />
      )}

      {/* Financial Goals Section */}
      {goals.length > 0 && (
        <div className="mb-6">
          <GoalTracker
            goals={goals.slice(0, 1)} // Show only the first goal on dashboard
            currentPortfolioValue={currentPortfolioValue}
            currency={user.settings.currency}
            className="mb-2"
          />
          {goals.length > 1 && (
            <div className="text-right">
              <Link
                to="/goals"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all {goals.length} goals →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming tasks */}
        <Card title="Upcoming Tasks">
          {upcomingTasks.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="py-3">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</h4>
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Due: {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                    {task.amount && (
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.settings.currency} {task.amount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No upcoming tasks.</p>
          )}
          <div className="mt-4">
            <Link
              to="/tasks"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all tasks →
            </Link>
          </div>
        </Card>

        {/* Portfolio summary */}
        <Card title="Portfolio Summary">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Available</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {user.settings.currency} {portfolioData?.freeCashAvailable?.toFixed(2) ?? 'N/A'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Deposit</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {portfolioData?.plannedInvestmentExpectedDepositDate?.Next_Gen_Growth ? formatDate(portfolioData.plannedInvestmentExpectedDepositDate.Next_Gen_Growth) : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Allocation Differences</h4>
              <div className="space-y-2">
                {portfolioData?.allocationAnalysis?.allocationDifferences &&
                  Object.entries(portfolioData.allocationAnalysis.allocationDifferences).map(([portfolio, difference]) => (
                    <div key={portfolio} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{portfolio}</span>
                      <span className={`text-sm font-medium ${
                        difference.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {difference}
                      </span>
                    </div>
                  ))}
                   {!portfolioData?.allocationAnalysis?.allocationDifferences && (
                      <p className="text-gray-500 dark:text-gray-400">Allocation analysis not available.</p>
                   )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/portfolio"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => {
                showToast({
                  type: "info",
                  message: "Loading portfolio details...",
                  duration: 2000
                });
              }}
            >
              View full portfolio →
            </Link>
          </div>
        </Card>
      </div>

      {/* Chat assistant promo - Using the reusable component */}
      <ChatPromo />
    </div>
  );
}
