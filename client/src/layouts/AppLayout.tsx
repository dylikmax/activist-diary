import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 🔐 Роли, имеющие доступ к админ-панели
// Добавь 'dept_lead', если нужно дать доступ руководителям отделов
const ADMIN_ROLES = ['secretary', 'vice_chair', 'chair', 'admin'];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="header">
        <nav>
          <Link to="/dashboard">Дашборд</Link>
          <Link to="/tasks">Задачи</Link>
          <Link to="/departments">Отделы</Link>
          
          {/* 🔥 Кнопка админки: рендерится только при совпадении роли */}
          {isAdmin && (
            <Link 
              to="/admin/tasks" 
              style={{ color: '#e53e3e', fontWeight: 600, borderLeft: '1px solid #ddd', paddingLeft: '1rem' }}
            >
              Админ-панель
            </Link>
          )}
        </nav>

        <div className="user-info">
          <span>{user?.login} ({user?.role})</span>
          <button onClick={handleLogout}style={{
            padding: '0.6rem 1rem',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 6,
            textDecoration: 'none',
            color: '#333',
            fontWeight: 500
          }}>Выйти</button>
        </div>
      </header>
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};