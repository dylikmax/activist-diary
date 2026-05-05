export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  pagination: PaginationMeta | null;
  errors: { code: string; message: string; details?: unknown } | null;
}

export const responseWrapper = {
  success: <T>(data: T, pagination?: PaginationMeta): ApiResponse<T> => ({
    success: true,
    data,
    pagination: pagination ?? null,
    errors: null,
  }),
  error: (code: string, message: string, details?: unknown): ApiResponse<null> => ({
    success: false,
    data: null,
    pagination: null,
    errors: { code, message, details },
  }),
};