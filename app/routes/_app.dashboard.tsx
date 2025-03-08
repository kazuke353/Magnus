import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node"; // Use 'type' import
import { json } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getUserTasks, Task } from "~/db/tasks.server";
import { getPortfolioData, PortfolioData } from "~/services/portfolio.server"; // Import PortfolioData type
import Card from "~/components/Card";
import { FiCalendar, FiDollarSign, FiPieChart, FiMessageSquare } from "react-icons/fi";
import { formatDate } from "~/utils/date";

export const loader: LoaderFunctionArgs = async ({ request }) => { // Explicitly type LoaderFunctionArgs
  const user = await requireAuthentication(request, "/login");

  // Get upcoming tasks
  const tasks = await getUserTasks(user.id);
  const upcomingTasks = tasks
    .filter(task => !task.completed && task.dueDate)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);

  // Get portfolio data
  const portfolioData = await getPortfolioData(user.id);

  return json({
    user,
    upcomingTasks,
    portfolioData, // portfolioData can be null now
  });
};

interface DashboardLoaderData { // Define interface for loader data
  user: Awaited<ReturnType<typeof requireAuthentication>>;
  upcomingTasks: Task[];
  portfolioData: PortfolioData | null; // portfolioData can be null
}


export default function Dashboard() {
  const { user, upcomingTasks, portfolioData } = useLoaderData<DashboardLoaderData>(); // Use the defined interface

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome, {user.username}!</h1>
        <p className="text-gray-600 dark:text-gray-400">Here's an overview of your financial portfolio and upcoming tasks.</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800">
              <FiDollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invested</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.settings.currency} {portfolioData?.overallSummary?.overallSummary?.totalInvestedOverall?.toFixed(2) ?? 'N/A'} {/* Correct path with overallSummary.overallSummary */}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`${portfolioData?.overallSummary?.overallSummary?.totalResultOverall >= 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'} dark:bg-opacity-20`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${portfolioData?.overallSummary?.overallSummary?.totalResultOverall >= 0 ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'}`}>
              <FiPieChart className={`h-6 w-6 ${portfolioData?.overallSummary?.overallSummary?.totalResultOverall >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Return</h3>
              <p className={`text-lg font-semibold ${portfolioData?.overallSummary?.overallSummary?.totalResultOverall >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {portfolioData?.overallSummary?.overallSummary?.totalResultOverall >= 0 ? '+' : ''}
                {user.settings.currency} {portfolioData?.overallSummary?.overallSummary?.totalResultOverall?.toFixed(2) ?? 'N/A'} {/* Correct path with overallSummary.overallSummary */}
                {' '}
                ({portfolioData?.overallSummary?.overallSummary?.returnPercentageOverall >= 0 ? '+' : ''} {/* Correct path with overallSummary.overallSummary */}
                {portfolioData?.overallSummary?.overallSummary?.returnPercentageOverall?.toFixed(2) ?? 'N/A'}%) {/* Correct path with overallSummary.overallSummary */}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-800">
              <FiCalendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming Tasks</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {upcomingTasks.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-800">
              <FiDollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Budget</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.settings.currency} {user.settings.monthlyBudget.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

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
                  {user.settings.currency} {portfolioData?.freeCashAvailable?.toFixed(2) ?? 'N/A'} {/* Handle null portfolioData - Correct path already here */}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Deposit</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {portfolioData?.plannedInvestmentExpectedDepositDate?.Next_Gen_Growth ? formatDate(portfolioData.plannedInvestmentExpectedDepositDate.Next_Gen_Growth) : 'N/A'} {/* Handle null portfolioData - updated path to plannedInvestmentExpectedDepositDate.Next_Gen_Growth */}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Allocation Differences</h4>
              <div className="space-y-2">
                {portfolioData?.allocationAnalysis?.allocationDifferences && // Conditionally render allocation differences - Correct path already here
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
                   {!portfolioData?.allocationAnalysis?.allocationDifferences && ( // Message if no allocation differences - Correct path already here
                      <p className="text-gray-500 dark:text-gray-400">Allocation analysis not available.</p>
                   )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/portfolio"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View full portfolio →
            </Link>
          </div>
        </Card>
      </div>

      {/* Chat assistant promo */}
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Need help with your finances?</h3>
            <p className="mt-1">Chat with our AI assistant to get personalized advice and insights.</p>
          </div>
          <Link
            to="/chat"
            className="px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 transition-colors"
          >
            <FiMessageSquare className="inline-block mr-2" />
            Start chatting
          </Link>
        </div>
      </Card>
    </div>
  );
}