
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { fetchPortfolioData, PortfolioData } from "~/services/portfolio.server";
import Card from "~/components/Card";
import Button from "~/components/Button";
import PortfolioChart from "~/components/PortfolioChart";
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiDollarSign, FiCalendar } from "react-icons/fi";
import { formatDate } from "~/utils/date";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  
  const portfolioData = await fetchPortfolioData(user.settings);
  
  return json({ user, portfolioData });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  
  if (action === "refresh") {
    const portfolioData = await fetchPortfolioData(user.settings);
    return json({ success: true, portfolioData });
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
}

export default function Portfolio() {
  const { user, portfolioData } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const handleRefresh = () => {
    const formData = new FormData();
    formData.append("_action", "refresh");
    submit(formData, { method: "post" });
  };
  
  const isRefreshing = navigation.state === "submitting";
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage your investment portfolio.</p>
        </div>
        
        <Button
          onClick={handleRefresh}
          isLoading={isRefreshing}
        >
          <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800">
              <FiDollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invested</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.settings.currency} {portfolioData.overallSummary.totalInvestedOverall.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className={`${portfolioData.overallSummary.totalResultOverall >= 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'} dark:bg-opacity-20`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${portfolioData.overallSummary.totalResultOverall >= 0 ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'}`}>
              {portfolioData.overallSummary.totalResultOverall >= 0 ? (
                <FiTrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <FiTrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Return</h3>
              <p className={`text-lg font-semibold ${portfolioData.overallSummary.totalResultOverall >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {portfolioData.overallSummary.totalResultOverall >= 0 ? '+' : ''}
                {user.settings.currency} {portfolioData.overallSummary.totalResultOverall.toFixed(2)}
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
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Deposit</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDate(portfolioData.deposit_info.expectedDepositDate)}
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
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Available</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.settings.currency} {portfolioData.deposit_info.freeCashAvailable.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio allocation chart */}
        <Card title="Portfolio Allocation">
          <PortfolioChart portfolioData={portfolioData} />
        </Card>
        
        {/* Portfolio details */}
        <Card title="Portfolio Details">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Return Percentage</p>
                  <p className={`text-lg font-semibold ${portfolioData.overallSummary.returnPercentageOverall >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {portfolioData.overallSummary.returnPercentageOverall >= 0 ? '+' : ''}
                    {portfolioData.overallSummary.returnPercentageOverall.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {portfolioData.overallSummary.fetchDate}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Deposit Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Monthly Budget</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.settings.currency} {user.settings.monthlyBudget.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Deposited This Month</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.settings.currency} {portfolioData.deposit_info.totalDepositedThisMonth.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Total Cash</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.settings.currency} {portfolioData.deposit_info.totalCash.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
                  {portfolioData.deposit_info.budgetMetThisMonth}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Instruments table */}
      <Card title="Portfolio Instruments">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Instrument
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Invested
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Value
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {portfolioData.portfolio[0].instruments.map((instrument) => (
                <tr key={instrument.ticker}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {instrument.fullName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {instrument.ticker}
                        </div>
                      </div>
                    </div>
                  