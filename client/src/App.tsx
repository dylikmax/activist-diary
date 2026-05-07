import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout.tsx';
import { AuthLayout } from './layouts/AuthLayout.tsx';
import { AdminLayout } from './layouts/AdminLayout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { TaskListPage } from './pages/TaskListPage.tsx';
import { TaskFormPage } from './pages/TaskFormPage.tsx';
import { TaskDetailPage } from './pages/TaskDetailPage.tsx';
import { DepartmentTreePage } from './pages/DepartmentTreePage.tsx';
import { DepartmentDetailPage } from './pages/DepartmentDetailPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { DepartmentManagePage } from './pages/DepartmentManagePage.tsx';
import { AdminDepartmentPage } from './pages/AdminDepartmentPage.tsx';
import { UserManagementPage } from './pages/UserManagmentPage.tsx';
import { AdminTaskListPage } from './pages/AdminTaskListPage.tsx';

const Page = (name: string) => () => <div className="page-stub"><h1>{name}</h1></div>;

// Системные
const UnauthorizedPage = Page('⛔ Доступ запрещён');
const NotFoundPage = Page('❌ 404');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
    mutations: { retry: 1 }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Публичные маршруты */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Защищённые маршруты — основной layout */}
            <Route element={
              <ProtectedRoute roles={['any']}>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TaskListPage />} />
              <Route path="/tasks/new" element={
                <ProtectedRoute roles={['any']}><TaskFormPage /></ProtectedRoute>
              } />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              <Route path="/tasks/:id/edit" element={
                <ProtectedRoute roles={['dept_lead+']}><TaskFormPage /></ProtectedRoute>
              } />
              <Route path="/departments" element={<DepartmentTreePage />} />
              <Route path="/departments/:id" element={<DepartmentDetailPage />} />
              <Route path="/departments/:id/manage" element={
                <ProtectedRoute roles={['dept_lead+']}><DepartmentManagePage /></ProtectedRoute>
              } />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Админские маршруты — расширенный layout */}
            <Route element={
              <ProtectedRoute roles={['dept_lead+']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin/tasks" element={
                <ProtectedRoute roles={['dept_lead+']}><AdminTaskListPage /></ProtectedRoute>
              } />
              <Route path="/admin/departments" element={
                <ProtectedRoute roles={['vice_chair+']}><AdminDepartmentPage /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['secretary+']}><UserManagementPage /></ProtectedRoute>
              } />
            </Route>

            {/* Системные */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />

            {/* Редирект с корня */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}