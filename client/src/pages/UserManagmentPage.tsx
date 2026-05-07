import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Role } from '../api/types';

interface AdminUser {
  id: string;
  login: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive' | 'banned';
  created_at: string;
}

const ROLES: Role[] = ['activist', 'dept_lead', 'secretary', 'vice_chair', 'chair', 'admin'];
const STATUS_OPTIONS = ['active', 'inactive', 'banned'] as const;

export const UserManagementPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: '' as Role, status: '' as typeof STATUS_OPTIONS[number] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // 🔌 Загрузка пользователей (адаптируй эндпоинт под свой бэк)
  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      // Если бэк поддерживает /users?search=..., используй его
      const res = await api.get('/users', { params: { search: search || undefined } });
      if (!res.data.success) throw new Error(res.data.errors?.message);
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
    retry: 1,
    staleTime: 2 * 60 * 1000
  });

  const handleApiError = (err: any) => {
    if (err.validationErrors) {
      const formatted: Record<string, string> = {};
      err.validationErrors.forEach((d: any) => (formatted[d.field] = d.message));
      setErrors(formatted);
    } else {
      setErrors({ form: err.response?.data?.errors?.message || 'Ошибка запроса' });
    }
    setTimeout(() => setErrors({}), 5000);
  };

  const updateUser = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AdminUser> }) => {
      return api.patch(`/users/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUserId(null);
      setSuccessMsg('Данные пользователя обновлены');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: handleApiError
  });

  const handleEditStart = (user: AdminUser) => {
    setEditingUserId(user.id);
    setEditForm({ role: user.role, status: user.status });
  };

  const handleSaveEdit = () => {
    if (!editingUserId) return;
    updateUser.mutate({ id: editingUserId, updates: editForm });
  };

  const handleCancelEdit = () => setEditingUserId(null);

  if (isLoading) return <div className="loading-spinner">Загрузка пользователей...</div>;

  const sectionStyle: React.CSSProperties = { background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: '1.25rem', marginBottom: '1.5rem' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', marginBottom: '0.25rem' };
  const errorStyle: React.CSSProperties = { color: '#d32f2f', fontSize: '0.85rem', marginBottom: '0.5rem' };
  const successStyle: React.CSSProperties = { color: '#4caf50', fontSize: '0.9rem', marginBottom: '0.75rem' };
  const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: '0.5rem' };
  const btnSecondary: React.CSSProperties = { padding: '0.5rem 1rem', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', marginRight: '0.5rem' };
  const badge = (color: string, text: string) => (
    <span style={{ padding: '0.2rem 0.5rem', background: color + '20', color, borderRadius: 4, fontSize: '0.8rem', fontWeight: 500 }}>{text}</span>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>👥 Управление пользователями</h2>
      {successMsg && <p style={successStyle}>{successMsg}</p>}
      {errors.form && <p style={errorStyle}>{errors.form}</p>}

      {/* 🔍 Поиск */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          style={inputStyle}
          placeholder="Поиск по логину или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 📋 Таблица */}
      <section style={sectionStyle}>
        {users?.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>Пользователи не найдены</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Логин / Email</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Роль</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Статус</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Дата регистрации</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee', textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users?.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 500 }}>{user.login}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{user.email}</div>
                    </td>
                    
                    {/* Режим редактирования или отображения */}
                    {editingUserId === user.id ? (
                      <>
                        <td style={{ padding: '0.75rem' }}>
                          <select style={inputStyle} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {errors.role && <p style={errorStyle}>{errors.role}</p>}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <select style={inputStyle} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as typeof STATUS_OPTIONS[number] }))}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button onClick={handleSaveEdit} disabled={updateUser.isPending} style={btnPrimary}>💾 Сохранить</button>
                          <button onClick={handleCancelEdit} style={btnSecondary}>Отмена</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '0.75rem' }}>{badge(user.role === 'dept_lead' ? '#fff3cd' : '#e8f5e9', user.role)}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {badge(user.status === 'active' ? '#e8f5e9' : user.status === 'banned' ? '#ffebee' : '#f5f5f5', user.status)}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
                          {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button onClick={() => handleEditStart(user)} style={btnSecondary}>Изменить</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};