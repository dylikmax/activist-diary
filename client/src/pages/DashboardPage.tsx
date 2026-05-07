import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { type Task } from '../api/types';
import { api } from '../api/client';

export const DashboardPage = () => {
  const { user } = useAuth();

  // Загружаем задачи текущего пользователя, отсортированные по дедлайну
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-tasks', user?.id],
    queryFn: async () => {
      const res = await api.get('/tasks', {
        params: { assignee_id: user?.id, limit: 10, sortBy: 'deadline', sortOrder: 'ASC' }
      });
      return res.data.data as Task[];
    },
    enabled: !!user?.id
  });

  // Вычисляем статистику на клиенте
  const tasks = data || [];
  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed' || t.status === 'archived').length,
    overdue: tasks.filter(t => 
      t.deadline && new Date(t.deadline) < new Date() && !['completed', 'archived'].includes(t.status)
    ).length
  };

  if (isLoading) return <div className="loading-spinner">Загрузка дашборда...</div>;
  if (error) return <div style={{ color: '#d32f2f', padding: '1rem' }}>Ошибка загрузки данных. Попробуйте обновить страницу.</div>;

  return (
    <div className="dashboard">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Привет, {user?.login}!</h1>
        <p style={{ color: '#666' }}>Роль: {user?.role} • Статус: {user?.status}</p>
      </header>

      {/* Статистика */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Всего задач" value={stats.total} />
        <StatCard title="В работе" value={stats.inProgress} color="#2196f3" />
        <StatCard title="Просрочено" value={stats.overdue} color="#f44336" />
        <StatCard title="Выполнено" value={stats.completed} color="#4caf50" />
      </section>

      {/* Быстрые действия */}
      <section style={{ marginBottom: '2rem' }}>
        <h3>Быстрые действия</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/tasks/new" style={btnStyle}>+ Создать задачу</Link>
          <Link to="/tasks" style={btnStyle}>Все задачи</Link>
          <Link to="/departments" style={btnStyle}>Структура</Link>
        </div>
      </section>

      {/* Предпросмотр задач */}
      <section>
        <h3>Ближайшие задачи</h3>
        {tasks.length === 0 ? (
          <p style={{ color: '#888' }}>Нет активных задач. Отличная возможность начать что-то новое!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
            {tasks.slice(0, 5).map(task => (
              <li key={task.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee' }}>
                <Link to={`/tasks/${task.id}`} style={{ textDecoration: 'none', color: '#333', fontWeight: 500 }}>
                  {task.title}
                </Link>
                <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#666', display: 'flex', gap: '1rem' }}>
                  <span>{task.deadline ? new Date(task.deadline).toLocaleDateString('ru-RU') : 'Без срока'}</span>
                  <span>{task.status}</span>
                  <span style={{ color: task.priority === 'urgent' ? '#d32f2f' : '#666' }}>
                    Приоритет: {task.priority}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

// Вспомогательные компоненты (inline для схематичности)
const StatCard = ({ title, value, color = '#333' }: { title: string; value: number; color?: string }) => (
  <div style={{ padding: '1rem', background: '#fff', borderRadius: 8, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>{title}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

const btnStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  background: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: 6,
  textDecoration: 'none',
  color: '#333',
  fontWeight: 500
};