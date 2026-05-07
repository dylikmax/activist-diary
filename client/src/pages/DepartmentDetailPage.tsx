import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { DepartmentTree } from '../api/types';

// 📌 Тип участника (в текущей spec нет GET /members, добавим тип для будущей интеграции)
interface DeptMember {
  id: string;
  login: string;
  email: string;
  member_role: 'member' | 'lead';
}

export const DepartmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Загрузка данных отдела
  const { data: dept, isLoading, error } = useQuery({
    queryKey: ['department-detail', id],
    queryFn: async () => {
      // В спецификации явно не указан GET /departments/:id, но это стандарт REST.
      // Если бэкенд не поддерживает, можно запросить GET /departments?expand=true и найти по ID.
      const res = await api.get(`/departments/${id}`);
      return res.data.data as DepartmentTree & { members?: DeptMember[] };
    },
    retry: 1
  });

  if (isLoading) return <div className="loading-spinner">Загрузка отдела...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#d32f2f' }}>Ошибка загрузки: {(error as Error).message}</div>;
  if (!dept) return <div style={{ padding: '2rem', textAlign: 'center' }}>Отдел не найден</div>;

  const isLeader = user?.id === dept.leader_id;
  const members = dept.members || [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: 850, margin: '0 auto' }}>
      {/* Навигация */}
      <Link to="/departments" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
        ← Назад к структуре
      </Link>

      {/* Шапка отдела */}
      <header style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e0e0e0', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>{dept.name}</h1>
        <p style={{ color: '#555', margin: '0 0 1rem', lineHeight: 1.5 }}>
          {dept.description || 'Описание отсутствует'}
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.9rem', color: '#444' }}>
          <div><b>Руководитель:</b> {isLeader ? 'Вы' : (dept.leader_id ? 'Назначен' : 'Не назначен')}</div>
          <div><b>ID:</b> {dept.id}</div>
          <div><b>Родитель:</b> {dept.parent_id ? 'Вложенный отдел' : 'Корневой'}</div>
        </div>

        {isLeader && (
          <Link to={`/departments/${id}/manage`} style={{ marginTop: '1rem', display: 'inline-block', padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', textDecoration: 'none', borderRadius: 6 }}>
            Управление отделом
          </Link>
        )}
      </header>

      {/* Список участников */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Участники ({members.length})</h2>
        {members.length === 0 ? (
          <div style={{ padding: '2rem', background: '#f8f9fa', borderRadius: 8, textAlign: 'center', color: '#666' }}>
            В этом отделе пока нет участников
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            {members.map((m, i) => (
              <div key={m.id} style={{ 
                padding: '0.75rem 1rem', 
                borderBottom: i < members.length - 1 ? '1px solid #eee' : 'none', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.login}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{m.email}</div>
                </div>
                <span style={{ 
                  padding: '0.25rem 0.6rem', 
                  background: m.member_role === 'lead' ? '#fff3cd' : '#e8f5e9', 
                  color: m.member_role === 'lead' ? '#856404' : '#155724', 
                  borderRadius: 6, fontSize: '0.8rem', fontWeight: 500 
                }}>
                  {m.member_role === 'lead' ? 'Руководитель' : 'Участник'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Футер-подсказка (если нет GET /members на бэке) */}
      {!dept.members && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff8e1', borderRadius: 6, fontSize: '0.9rem', color: '#856404', border: '1px solid #ffeaa7' }}>
          На бэкенде не реализован <code>GET /departments/:id/members</code>. Список участников отображается пустым. Добавьте эндпоинт или передайте `members` в ответе `GET /departments/:id`.
        </div>
      )}
    </div>
  );
};