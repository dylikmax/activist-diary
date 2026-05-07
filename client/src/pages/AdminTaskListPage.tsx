import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Task, Pagination, TaskStatus, TaskPriority } from '../api/types';

// 🎨 Цвета и маппинги
const STATUS_MAP: Record<TaskStatus, { label: string; color: string }> = {
  new: { label: 'Новая', color: '#9e9e9e' },
  in_progress: { label: 'В работе', color: '#2196f3' },
  under_review: { label: 'На проверке', color: '#ff9800' },
  completed: { label: 'Выполнена', color: '#4caf50' },
  rejected: { label: 'Отклонена', color: '#f44336' },
  archived: { label: 'Архив', color: '#757575' }
};

const PRIORITY_MAP: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Низкий', color: '#9e9e9e' },
  medium: { label: 'Средний', color: '#2196f3' },
  high: { label: 'Высокий', color: '#ff9800' },
  urgent: { label: 'Срочный', color: '#f44336' }
};

export const AdminTaskListPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    status: '',
    priority: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  // Убираем пустые фильтры перед запросом
  const queryParams = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== 0)
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-tasks', queryParams],
    queryFn: async () => {
      const res = await api.get('/tasks', { params: { ...queryParams, limit: 20 } });
      if (!res.data.success) throw new Error(res.data.errors?.message || 'Ошибка загрузки');
      return {
        tasks: res.data.data as Task[],
        pagination: res.data.pagination as Pagination
      };
    },
    retry: 1,
    staleTime: 60 * 1000
  });

  const setFilter = (field: string, value: string) => setFilters(f => ({ ...f, [field]: value, page: 1 }));
  const changePage = (newPage: number) => setFilters(f => ({ ...f, page: newPage }));
  const clearFilters = () => setFilters({ page: 1, status: '', priority: '', sortBy: 'created_at', sortOrder: 'DESC' });

  if (isLoading) return <div className="loading-spinner">Загрузка задач...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#d32f2f', textAlign: 'center' }}>{(error as Error).message}</div>;

  const taskList = data?.tasks || [];
  const pagination = data?.pagination;

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  // 🎨 Стили
  const sectionStyle: React.CSSProperties = { background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: '1.25rem', marginBottom: '1.5rem' };
  const inputStyle: React.CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: 4, border: '1px solid #ccc' };
  const badge = (color: string, text: string) => (
    <span style={{ padding: '0.2rem 0.5rem', background: color + '20', color, borderRadius: 4, fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>{text}</span>
  );
  const btnStyle: React.CSSProperties = { padding: '0.4rem 0.8rem', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' };

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Глобальный список задач</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => refetch()} style={btnStyle}>Обновить</button>
          <button onClick={clearFilters} style={{ ...btnStyle, background: '#fff', borderColor: '#ccc' }}>Сбросить фильтры</button>
        </div>
      </div>

      {/* 📊 Фильтры */}
      <section style={{ ...sectionStyle, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={inputStyle} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS_MAP).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>
        <select style={inputStyle} value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">Все приоритеты</option>
          {Object.entries(PRIORITY_MAP).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>
        <select style={inputStyle} value={filters.sortBy} onChange={e => setFilter('sortBy', e.target.value)}>
          <option value="created_at">Сначала новые</option>
          <option value="deadline">По дедлайну</option>
          <option value="priority">По приоритету</option>
        </select>
        <select style={inputStyle} value={filters.sortOrder} onChange={e => setFilter('sortOrder', e.target.value)}>
          <option value="DESC">По убыванию</option>
          <option value="ASC">По возрастанию</option>
        </select>
      </section>

      {/* 📋 Таблица задач */}
      <section style={sectionStyle}>
        {taskList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Задачи не найдены</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Название</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Исполнитель</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Отдел</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Статус</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Приоритет</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Дедлайн</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee', textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {taskList.map(task => {
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !['completed', 'archived'].includes(task.status);
                  return (
                    <tr key={task.id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.1s' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 500 }}>{task.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>ID: {task.id.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#555' }}>{task.assignee_login || '—'}</td>
                      <td style={{ padding: '0.75rem', color: '#555' }}>{task.department_name || '—'}</td>
                      <td style={{ padding: '0.75rem' }}>{badge(STATUS_MAP[task.status].color, STATUS_MAP[task.status].label)}</td>
                      <td style={{ padding: '0.75rem' }}>{badge(PRIORITY_MAP[task.priority].color, PRIORITY_MAP[task.priority].label)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: isOverdue ? '#d32f2f' : '#555', fontWeight: isOverdue ? 500 : 400 }}>
                        {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        {isOverdue && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}></span>}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <Link to={`/tasks/${task.id}`} style={{ ...btnStyle, background: '#e3f2fd', color: '#0d47a1', borderColor: '#bbdefb' }}>
                          Открыть
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 📄 Пагинация */}
      {pagination && pagination.total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.5rem 0' }}>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>
            Всего: {pagination.total} • Показано: {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={filters.page <= 1} onClick={() => changePage(filters.page - 1)} style={btnStyle}>← Назад</button>
            <span style={{ padding: '0.4rem', minWidth: 60, textAlign: 'center' }}>{filters.page} / {totalPages}</span>
            <button disabled={filters.page * pagination.limit >= pagination.total} onClick={() => changePage(filters.page + 1)} style={btnStyle}>Вперёд →</button>
          </div>
        </div>
      )}
    </div>
  );
};