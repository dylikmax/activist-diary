import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../api/types';

const USER_STORAGE_KEY = 'auth_user';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { login: string; password: string }) => Promise<void>;
  register: (data: { login: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const saved = sessionStorage.getItem(USER_STORAGE_KEY);
      
      if (saved) {
        // 1. Сразу восстанавливаем UI, чтобы не было "мигания" логина
        setUser(JSON.parse(saved));

        try {
          // 2. Тихо обновляем токены в фоне
          await api.post('/auth/refresh');
        } catch (err: any) {
          // Если бэк явно сказал "токен невалиден"
          if (err.response?.status === 401) {
            sessionStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
            window.location.href = '/login';
            return; // Прерываем init, isLoading не тронем
          }
          // Остальные ошибки (сеть, CORS, 500) игнорируем.
          // Куки всё равно прикрепятся к следующим запросам.
          console.warn('⚠️ Refresh failed (network/CORS), session kept active');
        }
      }

      setIsLoading(false);
    };
    init();
  }, []);

  // Слушаем глобальный сигнал от axios при полном отказе авторизации
  useEffect(() => {
    const handler = () => {
      setUser(null);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = async (credentials: { login: string; password: string }) => {
    const { data } = await api.post('/auth/login', credentials);
    if (data.success && data.data) {
      setUser(data.data);
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data));
    }
  };

  const register = async (data: { login: string; email: string; password: string }) => {
    await api.post('/auth/register', data);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};