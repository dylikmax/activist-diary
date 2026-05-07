import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <header className="header">
        <nav>
          <Link to="/dashboard">← В приложение</Link>
          <Link to="/admin/tasks">Задачи</Link>
          <Link to="/admin/departments">Отделы</Link>
          <Link to="/admin/users">Пользователи</Link>
        </nav>
        <div className="user-info">
          <span>
            {user?.login} ({user?.role})
          </span>
          <button onClick={handleLogout}>Выйти</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};
