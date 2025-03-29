import { useRouteError, isRouteErrorResponse, Link } from "@remix-run/react";
import { FiAlertTriangle, FiHome } from "react-icons/fi";

export default function ErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage = "An unexpected error occurred";
  let statusCode = 500;
  
  if (isRouteErrorResponse(error)) {
    errorMessage = error.data || error.statusText;
    statusCode = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <FiAlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          {statusCode === 404 ? "Page not found" : "Something went wrong"}
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {errorMessage}
        </p>
        
        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiHome className="mr-2" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
