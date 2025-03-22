import { useState, useCallback } from "react";
import { ErrorType, AppError, createError } from "~/utils/error-handler";

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: AppError | null;
}

export function useAsyncState<T>(initialData: T | null = null) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null
  });

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setData = useCallback((data: T) => {
    setState({ data, isLoading: false, error: null });
  }, []);

  const setError = useCallback((error: unknown) => {
    let appError: AppError;
    
    if (typeof error === "object" && error !== null && "type" in error && "message" in error && "status" in error) {
      appError = error as AppError;
    } else if (error instanceof Error) {
      appError = createError(
        ErrorType.UNKNOWN,
        error.message || "An unexpected error occurred",
        500,
        { stack: error.stack }
      );
    } else {
      appError = createError(
        ErrorType.UNKNOWN,
        typeof error === "string" ? error : "An unexpected error occurred",
        500
      );
    }
    
    setState({ data: null, isLoading: false, error: appError });
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, isLoading: false, error: null });
  }, [initialData]);

  const execute = useCallback(async <R>(
    asyncFunction: () => Promise<R>,
    onSuccess?: (data: R) => void,
    onError?: (error: AppError) => void
  ): Promise<R | null> => {
    try {
      setLoading(true);
      const result = await asyncFunction();
      setData(result as unknown as T);
      onSuccess?.(result);
      return result;
    } catch (error) {
      const appError = typeof error === "object" && error !== null && "type" in error 
        ? error as AppError
        : createError(
            ErrorType.UNKNOWN,
            error instanceof Error ? error.message : "An unexpected error occurred",
            500
          );
      
      setError(appError);
      onError?.(appError);
      return null;
    }
  }, [setLoading, setData, setError]);

  return {
    ...state,
    setLoading,
    setData,
    setError,
    reset,
    execute
  };
}
