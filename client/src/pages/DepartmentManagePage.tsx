import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { DepartmentTree, Role } from '../api/types';
import { MemberSelector } from '../components/forms/MemberSelector';
import { UserSelector } from '../components/forms/UserSelector';
import { useRef } from 'react';

// 📌 Тип участника (соответствует ответу бэкенда)
export interface DeptMember {
  id: string;
  login: string;
  email?: string;
  role: Role;
  member_role: 'member' | 'lead';
  created_at?: string;
}

export const DepartmentManagePage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Состояния форм
  const [deptForm, setDeptForm] = useState({ name: '', description: '', default_attachment_req: [] as string[] });
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'lead'>('member');
  const [leaderId, setLeaderId] = useState<string>('');

  
  const [successMsg, setSuccessMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 1. Загрузка данных отдела
  const {  data: dept, isLoading: deptLoading, error: deptError } = useQuery({
    queryKey: ['department-manage', id],
    queryFn: async () => {
      if (!id) throw new Error('ID отдела отсутствует');
      const res = await api.get(`/departments/${id}`);
      if (!res.data.success || !res.data.data) throw new Error(res.data.errors?.message || 'Отдел не найден');
      return res.data.data as DepartmentTree;
    },
    enabled: !!id,
    retry: 1,
  });

useEffect(() => {
  if (dept && leaderId === '') {
    setLeaderId(dept.leader_id || '');
  }
}, [dept]);

  // 2. 🔥 Загрузка участников через реальный эндпоинт
  const {  data: members, isLoading: membersLoading, error: membersError } = useQuery<DeptMember[]>({
    queryKey: ['department-members', id],
    queryFn: async () => {
      if (!id) return [];
      const res = await api.get(`/departments/${id}/members`);
      if (!res.data.success) throw new Error(res.data.errors?.message || 'Ошибка загрузки участников');
      // Бэкенд возвращает массив в data
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
    enabled: !!id,
    retry: 1,
  });

  const leaderInitRef = useRef(false);

  // Инициализация форм при загрузке данных
useEffect(() => {
  if (dept) {
    setDeptForm({
      name: dept.name,
      description: dept.description || '',
      parent_id: dept.parent_id || '',
      default_attachment_req: Array.isArray(dept.default_attachment_req) ? dept.default_attachment_req : []
    });
    
    // Инициализируем leaderId ТОЛЬКО при первой загрузке данных
    if (!leaderInitRef.current) {
      setLeaderId(dept.leader_id || '');
      leaderInitRef.current = true;
    }
  }
}, [dept]);

    // Хелпер обработки ошибок
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

  // 🔧 Мутация: Обновить отдел
  const updateDept = useMutation({
    mutationFn: async () => api.patch(`/departments/${id}`, deptForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-manage', id] });
      setSuccessMsg('Данные отдела обновлены');
    },
    onError: handleApiError
  });

  // 👥 Мутация: Добавить участника
  const addMember = useMutation({
    mutationFn: async () => api.post(`/departments/${id}/members`, {
      userId: newMemberId,
      member_role: newMemberRole
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-members', id] });
      setNewMemberId('');
      setSuccessMsg('Участник добавлен');
    },
    onError: handleApiError
  });

  // 🗑️ Мутация: Удалить участника
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const deptId = id; // явно берём из замыкания
      if (!userId || !deptId) {
        console.error('⚠️ DELETE FAILED:', { userId, deptId });
        throw new Error('Не удалось удалить: отсутствуют ID');
      }
      console.log(`🗑️ Отправляю DELETE /departments/${deptId}/members/${userId}`);
      return await api.delete(`/departments/${deptId}/members/${userId}`);
    },
    onSuccess: () => {
      console.log('✅ Удаление прошло успешно');
      queryClient.invalidateQueries({ queryKey: ['department-members', id] });
      setSuccessMsg('Участник удалён');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err) => {
      console.error('❌ Ошибка удаления:', err);
      handleApiError(err);
    }
  });

  // 👑 Мутация: Сменить руководителя (только vice_chair+)
  const changeLeader = useMutation({
    mutationFn: async () => api.put(`/departments/${id}/leader`, { userId: leaderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-manage', id] });
      setSuccessMsg('Руководитель изменен');
    },
    onError: handleApiError
  });

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    updateDept.mutate();
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberId.trim()) return;
    setSuccessMsg('');
    addMember.mutate();
  };

  const isViceChairPlus = ['vice_chair', 'chair', 'admin'].includes(user?.role || '');

  // 🛡️ Рендер состояний загрузки
  if (deptLoading) return <div className="loading-spinner">Загрузка данных отдела...</div>;
  if (deptError) {
    const msg = (deptError as any).response?.data?.errors?.message || (deptError as Error).message;
    return <div style={{ padding: '2rem', color: '#d32f2f', textAlign: 'center' }}>{msg}</div>;
  }
  if (!dept) return <div style={{ padding: '2rem', textAlign: 'center' }}>Отдел не найден</div>;

  // Стили
  const sectionStyle: React.CSSProperties = { background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: '1.25rem', marginBottom: '1.5rem' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', marginBottom: '0.25rem' };
  const errorStyle: React.CSSProperties = { color: '#d32f2f', fontSize: '0.85rem', marginBottom: '0.5rem' };
  const successStyle: React.CSSProperties = { color: '#4caf50', fontSize: '0.9rem', marginBottom: '0.75rem' };
  const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
  const btnDanger: React.CSSProperties = { padding: '0.4rem 0.8rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' };

  console.log('👥 Members:', members, 'Loading:', membersLoading, 'Error:', membersError);

    const normalizedMembers = (members || []).map(m => ({
    ...m,
    id: (m as any).id || (m as any).user_id || (m as any).userId || `fallback-${(m as any).login}`,
    login: m.login || '',
    email: (m as any).email || '',
    member_role: m.member_role || 'member'
  }));

  // 🔍 Временный лог: посмотри в консоли, какие поля реально приходят от бэка
  if (normalizedMembers.length > 0) {
    console.log('📦 Бэк вернул:', normalizedMembers[0]);
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Управление: {dept.name}</h2>
      {successMsg && <p style={successStyle}>{successMsg}</p>}
      {errors.form && <p style={errorStyle}>{errors.form}</p>}

      {/* 📝 Основные настройки */}
      <section style={sectionStyle}>
        <h3 style={{ margin: '0 0 1rem' }}>Настройки отдела</h3>
        <form onSubmit={handleDeptSubmit}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label>Название</label>
            <input style={inputStyle} value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} required />
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label>Описание</label>
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Требуются вложения по умолчанию:</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
              {['photo', 'video', 'text', 'file'].map(type => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={deptForm.default_attachment_req.includes(type)}
                    onChange={e => setDeptForm(f => ({
                      ...f,
                      default_attachment_req: e.target.checked ? [...f.default_attachment_req, type] : f.default_attachment_req.filter(t => t !== type)
                    }))}
                  /> {type}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={updateDept.isPending} style={btnPrimary}>
            {updateDept.isPending ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </section>

{isViceChairPlus && (
  <section style={sectionStyle}>
    <h3 style={{ margin: '0 0 1rem' }}>Руководитель отдела</h3>
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260 }}>
  <MemberSelector
    value={leaderId}
    onChange={(id) => {
      console.log('✅ Выбор сработал:', id);
      setLeaderId(id);
    }}
    members={normalizedMembers} // 🔥 Передаём нормализованный массив
    isLoading={membersLoading}
    label="Новый руководитель"
  />
        {errors.userId && <p style={errorStyle}>{errors.userId}</p>}
      </div>
      <button
        onClick={() => changeLeader.mutate()}
        disabled={changeLeader.isPending || !leaderId}
        style={{ ...btnPrimary, height: '40px', alignSelf: 'flex-end', marginTop: 'auto' }}
      >
        {changeLeader.isPending ? '...' : 'Назначить'}
      </button>
    </div>
  </section>
)}

      {/* 👥 Участники */}
      <section style={sectionStyle}>
        <h3 style={{ margin: '0 0 1rem' }}>Участники</h3>
        
        {/* Форма добавления */}
        <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <UserSelector
  value={newMemberId}
  onChange={setNewMemberId}
  placeholder="Найти пользователя..."
  excludeUserId={user?.id} // Опционально: не показывать себя в списке
  label="Пользователь"
/>
          <select style={{ ...inputStyle, flex: 1 }} value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as any)}>
            <option value="member">Участник</option>
            <option value="lead">Руководитель подотдела</option>
          </select>
          <button type="submit" disabled={addMember.isPending} style={btnPrimary}>Добавить</button>
        </form>
        {errors.userId && <p style={errorStyle}>{errors.userId}</p>}

        {/* Список участников */}
        {membersLoading ? (
          <div style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>Загрузка списка...</div>
        ) : membersError ? (
          <div style={{ color: '#d32f2f', fontSize: '0.9rem', textAlign: 'center' }}>
            ⚠️ Не удалось загрузить участников: {(membersError as Error).message}
          </div>
        ) : !members || members.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>В этом отделе пока нет участников</div>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 6 }}>
                    {!members || members.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>В этом отделе пока нет участников</div>
        ) : (
          <div style={{ border: '1px solid #eee', borderRadius: 6 }}>
            {members.map((m, i) => {
              // 🔍 Ищем правильный ID в ответе бэкенда (id / user_id / userId)
              const memberId = (m as any).id || (m as any).user_id || (m as any).userId;
              
              // 🔍 Первый рендер выведет структуру, чтобы ты точно знал поле
              if (i === 0) console.log('Структура участника от бэка:', m);

              return (
                <div key={memberId || i} style={{ 
                  padding: '0.75rem 1rem', borderBottom: i < members.length - 1 ? '1px solid #eee' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.login}</div>
                    {m.email && <div style={{ fontSize: '0.85rem', color: '#666' }}>{m.email}</div>}
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Роль: {m.role}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500,
                      background: m.member_role === 'lead' ? '#fff3cd' : '#e8f5e9',
                      color: m.member_role === 'lead' ? '#856404' : '#155724'
                    }}>
                      {m.member_role === 'lead' ? 'Лидер' : 'Участник'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!memberId) {
                          alert('Ошибка: ID участника не найден в ответе сервера. Открой консоль (F12) и посмотри "Структура участника"');
                          return;
                        }
                        if (window.confirm(`Удалить ${m.login} из отдела?`)) {
                          removeMember.mutate(memberId);
                        }
                      }}
                      disabled={removeMember.isPending}
                      style={btnDanger}
                    >
                      {removeMember.isPending ? '⏳...' : 'Удалить'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        )}
      </section>
    </div>
  );
};