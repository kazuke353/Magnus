import { useLoaderData, Link, useFetcher } from "@remix-run/react";
import { useState, useMemo, useEffect, useRef } from "react"; // <-- Add useRef
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getUserTasks, Task } from "~/db/tasks.server";
import { getUserGoals, Goal } from "~/db/goals.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import Card from "~/components/Card";
import PortfolioSummary from "~/components/PortfolioSummary";
import GoalTracker from "~/components/GoalTracker";
import ChatPromo from "~/components/ChatPromo";
import { showToast } from "~/components/ToastContainer";
import { formatDate } from "~/utils/formatters";
import { errorResponse, createApiError } from "~/utils/error-handler";


// --- Loader definition remains the same as the previous corrected version ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await requireAuthentication(request);
    if (!user) {
      return json({ error: "Authentication required", user: null, upcomingTasks: [], goals: [] }, { status: 401 });
    }
    let upcomingTasks: Task[] = [];
    try {
      const tasks = await getUserTasks(user.id);
      upcomingTasks = tasks.filter(task => !task.completed && task.dueDate).sort((a, b) => {
          if (!a.dueDate) return 1; if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }).slice(0, 5);
    } catch (taskError) { console.error("Error fetching tasks:", taskError); }
    let goals: Goal[] = [];
    try { goals = await getUserGoals(user.id); } catch (goalError) { console.error("Error fetching goals:", goalError); }
    return json({ user, upcomingTasks, goals });
  } catch (error) {
     if (error instanceof Response) { throw error; }
     console.error("Error in dashboard loader:", error);
     return errorResponse(error);
  }
};

interface DashboardLoaderData {
  user: Awaited<ReturnType<typeof requireAuthentication>>;
  upcomingTasks: Task[];
  goals: Goal[];
  error?: any;
}


export default function Dashboard() {
  const initialData = useLoaderData<typeof loader>();
  const portfolioFetcher = useFetcher<{ portfolioData: PerformanceMetrics | null; error?: string; details?: any }>();

  const [portfolioData, setPortfolioData] = useState<PerformanceMetrics | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(portfolioFetcher.state !== 'idle');
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  const { user, upcomingTasks, goals, error: initialLoaderError } = initialData.error
    ? { user: null, upcomingTasks: [], goals: [], error: initialData.error }
    : { ...initialData, error: null };

  const fetchInitiated = useRef(false);

  useEffect(() => {
      if (!fetchInitiated.current) {
          fetchInitiated.current = true;
          setPortfolioLoading(true);
          setPortfolioError(null);

          fetch("/api/portfolio")
              .then(response => {
                  if (!response.ok) {
                      return response.json().catch(() => null).then(body => {
                           const errorMsg = body?.error || `HTTP error! Status: ${response.status}`;
                           console.error("API Response Error:", response.status, body);
                           throw new Error(errorMsg);
                      });
                  }
                  return response.json();
              })
              .then(data => {
                  const { portfolioData: fetchedData, error: apiError } = data;

                  if (apiError) {
                      console.error("API returned an error:", apiError);
                      setPortfolioError(apiError || "Failed to load portfolio data.");
                      setPortfolioData(null);
                      showToast({ type: "error", message: apiError || "Could not load portfolio summary.", duration: 5000 });
                  } else if (fetchedData === undefined) {
                       console.error("API response missing 'portfolioData' field:", data);
                       setPortfolioError("Invalid data format received from server.");
                       setPortfolioData(null);
                       showToast({ type: "error", message: "Received invalid data for portfolio.", duration: 5000 });
                  }
                  else {
                      setPortfolioData(fetchedData);
                      setPortfolioError(null); // Clear error on success
                  }
              })
              .catch(error => {
                  console.error("Standard fetch failed:", error);
                  setPortfolioError(error.message || "Network error loading portfolio data.");
                  setPortfolioData(null);
                  showToast({ type: "error", message: "Network error: Could not load portfolio data.", duration: 5000 });
              })
              .finally(() => {
                  setPortfolioLoading(false); // Set loading false when fetch completes (success or error)
              });
      }
      // Empty dependency array ensures this runs only once on mount
  }, []);


  // Process the fetched portfolio data or errors (Handles state changes)
  useEffect(() => {
    // Update loading state based on fetcher activity
    if (portfolioFetcher.state === 'loading') {
        setPortfolioLoading(true);
        setPortfolioError(null); // Clear error when loading starts
    } else if (portfolioFetcher.state === 'idle') {
        // Only process data if the fetcher has returned data
        if (portfolioFetcher.data) {
            const { portfolioData: fetchedData, error: fetchError, details } = portfolioFetcher.data;
            if (fetchError) {
                console.error("Error fetching portfolio data:", fetchError, details);
                setPortfolioError(fetchError || "Failed to load portfolio data.");
                setPortfolioData(null);
                showToast({ type: "error", message: fetchError || "Could not load portfolio summary.", duration: 5000 });
            } else {
                setPortfolioData(fetchedData);
                setPortfolioError(null);
            }
        }
        // If idle but no data (e.g., initial state before load), don't turn off loading prematurely
        // unless fetch has actually finished (indicated by presence of portfolioFetcher.data)
        if (portfolioFetcher.data !== undefined) {
             setPortfolioLoading(false); // Turn off loading only when idle AND data/error is processed
        }
    }
  }, [portfolioFetcher.state, portfolioFetcher.data]);


  // Show initial loader error toast
  useEffect(() => {
    if (initialLoaderError) {
      showToast({
        type: "error",
        message: initialLoaderError.message || "An error occurred loading initial dashboard data",
        duration: 5000
      });
    }
  }, [initialLoaderError]);


  // Memoize portfolio metrics based on the state variable
  const portfolioSummaryData = useMemo(() => {
    if (!portfolioData || !portfolioData.overallSummary || !portfolioData.overallSummary.overallSummary) return null;
    return {
      totalInvested: portfolioData.overallSummary.overallSummary.totalInvestedOverall || 0,
      totalResult: portfolioData.overallSummary.overallSummary.totalResultOverall || 0,
      returnPercentage: portfolioData.overallSummary.overallSummary.returnPercentageOverall || 0,
      fetchDate: portfolioData.overallSummary.overallSummary.fetchDate || new Date().toISOString(),
      estimatedAnnualDividend: portfolioData.allocationAnalysis?.estimatedAnnualDividend || 0
    };
  }, [portfolioData]);

  // Calculate current portfolio value based on the state variable
  const currentPortfolioValue = useMemo(() => {
    if (!portfolioSummaryData) return 0;
    return portfolioSummaryData.totalInvested + portfolioSummaryData.totalResult;
  }, [portfolioSummaryData]);

  // Render authentication required message if user is null from initial loader
   if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <div className="text-center p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {initialLoaderError ? "Error" : "Authentication Required"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {initialLoaderError
                ? initialLoaderError.message || "Could not load user data."
                : "Please log in to view your dashboard."}
            </p>
            {!initialLoaderError && (
               <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // --- Main Dashboard Render ---
  return (
    <div className="space-y-6">
      <div>
        {/* Welcome message uses initial data */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome, {user.firstName} {user.lastName}!</h1>
        <p className="text-gray-600 dark:text-gray-400">Here's an overview of your financial portfolio and upcoming tasks.</p>
      </div>

      {/* Portfolio Summary - Show loading/error state or data */}
      {portfolioLoading ? (
         <Card className="animate-pulse">
            <div className="p-4 space-y-3">
               <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
               <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
               <div className="grid grid-cols-3 gap-4 pt-2">
                 <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                 <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                 <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
               </div>
            </div>
         </Card>
      ) : portfolioError ? (
         <Card>
             <p className="p-4 text-red-600 dark:text-red-400">Error loading portfolio summary: {portfolioError}</p>
         </Card>
      ) : portfolioSummaryData ? (
        <PortfolioSummary
          totalInvested={portfolioSummaryData.totalInvested}
          totalResult={portfolioSummaryData.totalResult}
          returnPercentage={portfolioSummaryData.returnPercentage}
          fetchDate={portfolioSummaryData.fetchDate}
          estimatedAnnualDividend={portfolioSummaryData.estimatedAnnualDividend}
          currency={user.settings.currency}
          compact={true}
        />
      ) : (
         <Card>
            <p className="p-4 text-gray-500 dark:text-gray-400">Portfolio summary is currently unavailable.</p>
         </Card>
      )}


      {/* Financial Goals Section (Uses derived portfolio value) */}
      {goals.length > 0 && (
        <div className="mb-6">
          <GoalTracker
            goals={goals.slice(0, 1)} // Show only the first goal on dashboard
            // Pass the calculated value, which depends on fetched data
            currentPortfolioValue={currentPortfolioValue}
            currency={user.settings.currency}
            className="mb-2"
            // Add a loading state if needed, though it uses calculated value which defaults to 0
            // isLoading={portfolioLoading}
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

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming tasks (Uses initial data) */}
        <Card title="Upcoming Tasks">
           {/* ... Task rendering logic remains the same ... */}
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

        {/* Portfolio summary Card - Show loading/error state or data */}
        <Card title="Portfolio Details">
          {portfolioLoading ? (
             <div className="p-4 space-y-4 animate-pulse">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-1"></div>
                     <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                   <div>
                     <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-1"></div>
                     <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
               </div>
                <div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                  <div className="space-y-2">
                     <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                     <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  </div>
               </div>
                <div className="mt-4 h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
             </div>
          ) : portfolioError ? (
             <p className="p-4 text-red-600 dark:text-red-400">Error loading portfolio details.</p>
          ) : portfolioData ? (
            <div className="space-y-4">
              {/* Content using portfolioData state */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Available</h4>
                   <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                     {user.settings.currency} {portfolioData.freeCashAvailable?.toFixed(2) ?? 'N/A'}
                   </p>
                 </div>
                 <div>
                   <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Deposit</h4>
                   <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                     {portfolioData.plannedInvestmentExpectedDepositDate?.Next_Gen_Growth ? formatDate(portfolioData.plannedInvestmentExpectedDepositDate.Next_Gen_Growth) : 'N/A'}
                   </p>
                 </div>
               </div>

               <div>
                 <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Allocation Differences</h4>
                 <div className="space-y-2">
                    {portfolioData.allocationAnalysis?.allocationDifferences &&
                     Object.entries(portfolioData.allocationAnalysis.allocationDifferences).length > 0 ? (
                       Object.entries(portfolioData.allocationAnalysis.allocationDifferences).map(([portfolio, difference]) => (
                         <div key={portfolio} className="flex justify-between items-center">
                           <span className="text-sm text-gray-700 dark:text-gray-300">{portfolio}</span>
                           <span className={`text-sm font-medium ${
                             difference < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                           }`}>
                             {difference}
                           </span>
                         </div>
                       ))
                     ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Allocation analysis not available.</p>
                     )}
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
            </div>
          ) : (
            <p className="p-4 text-gray-500 dark:text-gray-400">Portfolio details are currently unavailable.</p>
          )}
        </Card>
      </div>

      {/* Chat assistant promo (Static) */}
      <ChatPromo />
    </div>
  );
}
