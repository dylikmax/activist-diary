import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Task, Pagination, TaskStatus, TaskPriority } from '../api/types';

const STATUS_COLORS: Record<TaskStatus, string> = {
  new: '#9e9e9e', in_progress: '#2196f3', under_review: '#ff9800',
  completed: '#4caf50', rejected: '#f44336', archived: '#757575'
};
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#9e9e9e', medium: '#2196f3', high: '#ff9800', urgent: '#f44336'
};

export const TaskListPage = () => {
  const [filters, setFilters] = useState({
    page: 1, status: '', priority: '', department_id: '', assignee_id: '',
    sortBy: 'created_at', sortOrder: 'DESC'
  });

  // Убираем пустые значения перед отправкой
  const queryParams = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== 0)
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tasks-list', queryParams],
    queryFn: async () => {
      const res = await api.get('/tasks', { params: queryParams });
      return { tasks: res.data.data as Task[], pagination: res.data.pagination as Pagination };
    }
  });

  const tasks = data?.tasks || [];
  const pagination = data?.pagination;

  const setFilter = (field: string, value: string) => setFilters(f => ({ ...f, [field]: value, page: 1 }));
  const changePage = (newPage: number) => setFilters(f => ({ ...f, page: newPage }));

  const selectStyle: React.CSSProperties = { padding: '0.4rem', borderRadius: 4, border: '1px solid #ccc' };
  const badge = (color: string, text: string) => (
    <span style={{ padding: '0.2rem 0.5rem', background: color + '20', color, borderRadius: 4, fontSize: '0.8rem', textTransform: 'uppercase' }}>
      {text}
    </span>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Список задач</h2>
        <Link to="/tasks/new" style={{ padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', textDecoration: 'none', borderRadius: 6 }}>+ Новая задача</Link>
      </div>

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
        <select style={selectStyle} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">Все статусы</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">Все приоритеты</option>
          {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => refetch()} style={selectStyle}>Обновить</button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Загрузка...</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Задачи не найдены</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          {/* Заголовок таблицы */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.2fr', padding: '0.75rem 1rem', background: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>
            <span>Название</span><span>Исполнитель</span><span>Статус</span><span>Приоритет</span><span>Дедлайн</span>
          </div>
          {/* Строки */}
          {tasks.map(task => (
            <Link key={task.id} to={`/tasks/${task.id}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.2fr', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', textDecoration: 'none', color: '#333', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{task.title}</span>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>{task.assignee_login || '—'}</span>
              <span>{badge(STATUS_COLORS[task.status], task.status)}</span>
              <span>{badge(PRIORITY_COLORS[task.priority], task.priority)}</span>
              <span style={{ fontSize: '0.9rem', color: task.deadline && new Date(task.deadline) < new Date() ? '#d32f2f' : '#666' }}>
                {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Пагинация */}
      {pagination && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)} style={selectStyle}>← Назад</button>
          <span style={{ padding: '0.4rem' }}>Стр. {pagination.page} из {Math.ceil(pagination.total / pagination.limit)}</span>
          <button disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => changePage(pagination.page + 1)} style={selectStyle}>Вперед →</button>
        </div>
      )}
    </div>
  );
};