import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireAuth } from "~/utils/auth";
import { getUser } from "~/models/user.server";
import { getPortfolioData } from "~/models/portfolio.server";
import { getUserTasks } from "~/models/tasks.server";
import { formatCurrency, formatPercentage } from "~/utils/formatters";
import Card from "~/components/Card";
import Button from "~/components/Button";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth(request);
  const user = await getUser(request);
  const portfolioData = getPortfolioData();
  const tasks = await getUserTasks(userId);
  
  return json({ user, portfolioData, tasks });
}

export default function Dashboard() {
  const { user, portfolioData, tasks } = useLoaderData<typeof loader>();
  const { portfolio, deposit_info, allocation_analysis } = portfolioData;
  const summary = portfolio[0].overallSummary;
  
  // Calculate upcoming tasks
  const upcomingTasks = tasks
    .filter(task => !task.completed && task.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.email}
        </p>
      </div>
      
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white overflow-hidden shadow-md border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invested</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {formatCurrency(summary.totalInvestedOverall)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-white overflow-hidden shadow-md border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 ${summary.totalResultOverall >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Return</dt>
                  <dd>
                    <div className={`text-lg font-medium ${summary.totalResultOverall >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.totalResultOverall)} ({(summary.returnPercentageOverall * 100).toFixed(2)}%)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-white overflow-hidden shadow-md border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Next Deposit</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {deposit_info.expectedDepositMessage}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Allocation Analysis */}
      <Card title="Portfolio Allocation" className="bg-white shadow-md border border-gray-100">
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-500">Target Allocation</h4>
          <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {Object.entries(allocation_analysis.targetAllocation).map(([category, percentage]) => (
              <div key={category} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h5 className="text-sm font-medium text-gray-700">{category}</h5>
                <p className="mt-1 text-lg font-semibold text-gray-900">{percentage}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-500">Current Allocation</h4>
          <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {Object.entries(allocation_analysis.currentAllocation).map(([category, value]) => (
              <div key={category} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h5 className="text-sm font-medium text-gray-700">{category}</h5>
                <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
                <p className={`mt-1 text-sm ${
                  parseFloat(allocation_analysis.allocationDifferences[category]) > 0 
                    ? 'text-green-600' 
                    : parseFloat(allocation_analysis.allocationDifferences[category]) < 0 
                      ? 'text-red-600' 
                      : 'text-gray-500'
                }`}>
                  Difference: {allocation_analysis.allocationDifferences[category]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      {/* Upcoming Tasks */}
      <Card title="Upcoming Tasks" className="bg-white shadow-md border border-gray-100">
        {upcomingTasks.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {upcomingTasks.map((task) => (
              <li key={task.id} className="py-4 hover:bg-gray-50 transition-colors rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <div className="flex items-center mt-1">
                      <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-gray-500">
                        Due: {new Date(task.dueDate!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {task.financialAmount && (
                    <div className="text-sm font-medium text-gray-900 bg-green-50 px-3 py-1 rounded-full">
                      {formatCurrency(task.financialAmount)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="mt-2 text-gray-500">No upcoming tasks</p>
          </div>
        )}
        <div className="mt-4">
          <Button to="/tasks" variant="secondary">View All Tasks</Button>
        </div>
      </Card>
    </div>
  );
}
