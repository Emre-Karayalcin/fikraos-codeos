/**
 * API Error Response Type
 */
export interface ApiError {
  message?: string;
  detail?: string;
  error?: string;
  statusCode?: number;
}

/**
 * API Response Type
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: ApiError;
}

/**
 * Paginated API Response Type
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get List Params Type
 */
export interface GetListParams {
  page: number;
  limit: number;
}
