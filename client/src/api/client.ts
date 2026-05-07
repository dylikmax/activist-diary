import axios, { type AxiosInstance, type InternalAxiosRequestConfig, AxiosError } from 'axios';
import type { ApiResponse } from './types'; // ← 🔥 добавлено 'type'

export const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor для добавления timestamp (обход кеша)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.params = { ...config.params, _t: Date.now() };
  return config;
});

// Обработка 401: авто-рефреш токена
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve());
  failedQueue = [];
};

api.interceptors.response.use(
  res => res,
  async (error: AxiosError<ApiResponse>) => { // ← ApiResponse используется только как тип
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue();
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Пробрасываем ошибки валидации для форм
    if (error.response?.data?.errors?.code === 'VALIDATION_ERROR') {
      return Promise.reject({ validationErrors: error.response.data.errors.details });
    }

    return Promise.reject(error);
  }
);

// Глобальный слушатель для редиректа при потере авторизации
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    window.location.href = '/login';
  });
}