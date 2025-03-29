import { json } from "@remix-run/node";

export enum ErrorType {
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION = "VALIDATION",
  SERVER = "SERVER",
  NETWORK = "NETWORK",
  API = "API",
  DATABASE = "DATABASE",
  UNKNOWN = "UNKNOWN"
}

export interface AppError {
  type: ErrorType;
  message: string;
  status: number;
  details?: Record<string, any>;
}

export function createError(
  type: ErrorType,
  message: string,
  status: number = 500,
  details?: Record<string, any>
): AppError {
  return {
    type,
    message,
    status,
    details
  };
}

export function handleError(error: unknown) {
  // First, check if this is a Response object (like a redirect)
  // Instead of using instanceof, check for Response properties
  if (
    error && 
    typeof error === "object" && 
    "status" in error && 
    "headers" in error &&
    typeof (error as any).status === "number" &&
    typeof (error as any).headers === "object"
  ) {
    // Don't treat redirects or other Response objects as errors
    // Just return them directly
    return error;
  }
  
  // Log the error for debugging, but don't log redirects
  console.error("Error occurred:", error);
  
  // Handle known error types
  if (typeof error === "object" && error !== null && "type" in error && "message" in error && "status" in error) {
    return error as AppError;
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return createError(
      ErrorType.UNKNOWN,
      error.message || "An unexpected error occurred",
      500,
      { stack: error.stack }
    );
  }
  
  // Handle other unknown errors
  return createError(
    ErrorType.UNKNOWN,
    typeof error === "string" ? error : "An unexpected error occurred",
    500
  );
}

export function errorResponse(error: unknown) {
  const result = handleError(error);
  
  // If it's already a Response (like a redirect), just return it
  // Check for Response-like properties instead of using instanceof
  if (
    result && 
    typeof result === "object" && 
    "status" in result && 
    "headers" in result &&
    typeof (result as any).status === "number" &&
    typeof (result as any).headers === "object"
  ) {
    return result;
  }
  
  // Otherwise, it's an AppError, so create a JSON response
  return json(
    { error: result },
    { status: (result as AppError).status }
  );
}

// Specific error creators for common scenarios
export function createNotFoundError(resource: string, details?: Record<string, any>): AppError {
  return createError(
    ErrorType.NOT_FOUND,
    `The requested ${resource} was not found`,
    404,
    details
  );
}

export function createAuthenticationError(message: string = "Authentication required", details?: Record<string, any>): AppError {
  return createError(
    ErrorType.AUTHENTICATION,
    message,
    401,
    details
  );
}

export function createAuthorizationError(message: string = "You don't have permission to access this resource", details?: Record<string, any>): AppError {
  return createError(
    ErrorType.AUTHORIZATION,
    message,
    403,
    details
  );
}

export function createValidationError(message: string, details?: Record<string, any>): AppError {
  return createError(
    ErrorType.VALIDATION,
    message,
    400,
    details
  );
}

export function createApiError(message: string, details?: Record<string, any>): AppError {
  return createError(
    ErrorType.API,
    message,
    500,
    details
  );
}

export function createDatabaseError(message: string, details?: Record<string, any>): AppError {
  return createError(
    ErrorType.DATABASE,
    message,
    500,
    details
  );
}

export function createNetworkError(message: string = "Network error occurred", details?: Record<string, any>): AppError {
  return createError(
    ErrorType.NETWORK,
    message,
    503,
    details
  );
}
