import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Role } from '../../api/types';

export interface UserOption {
  id: string;
  login: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive' | 'banned';
}

interface UserSelectorProps {
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  requiredRoles?: Role[]; // Фильтр по ролям (опционально)
  excludeUserId?: string; // Исключить текущего пользователя
  label?: string;
}

export const UserSelector = ({
  value,
  onChange,
  placeholder = 'Поиск пользователя...',
  requiredRoles,
  excludeUserId,
  label
}: UserSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 🔌 Загрузка пользователей (адаптируй эндпоинт под свой бэк)
  const { data: users, isLoading } = useQuery<UserOption[]>({
    queryKey: ['users-list'],
    queryFn: async () => {
      // Если бэк не поддерживает /users, замени на /auth/users или другой эндпоинт
      const res = await api.get('/users');
      if (!res.data.success) throw new Error(res.data.errors?.message);
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000 // Кэш 5 минут
  });

  // Закрытие по клику вне
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Фильтрация списка
  const filtered = users?.filter(u => {
    if (excludeUserId && u.id === excludeUserId) return false;
    if (requiredRoles && !requiredRoles.includes(u.role)) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.login.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    }
    return true;
  }) || [];

  // Выбранный пользователь для отображения
  const selected = users?.find(u => u.id === value);

  const handleSelect = (user: UserOption) => {
    onChange(user.id);
    setSearch('');
    setIsOpen(false);
  };

  // Стили
  const wrapperStyle: React.CSSProperties = { position: 'relative', width: '100%' };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc',
    cursor: 'pointer', background: '#fff'
  };
  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: 0, right: 0,
    background: '#fff', border: '1px solid #ccc', borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: 250, overflowY: 'auto'
  };
  const searchStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem', border: 'none', borderBottom: '1px solid #eee',
    outline: 'none', boxSizing: 'border-box'
  };
  const itemStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '0.5rem 0.75rem', cursor: 'pointer',
    background: isSelected ? '#f0f7ff' : 'transparent',
    borderBottom: '1px solid #f5f5f5'
  });

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      {label && <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>{label}</label>}
      
      {/* Поле выбора */}
      <div
        style={inputStyle}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected ? (
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>👤 {selected.login} <small style={{ color: '#888' }}>({selected.email})</small></span>
            <span style={{ fontSize: '0.8rem', color: '#0066cc' }}>✕</span>
          </span>
        ) : (
          <span style={{ color: '#888' }}>{placeholder}</span>
        )}
      </div>

      {/* Выпадающий список */}
      {isOpen && (
        <div style={dropdownStyle}>
          <input
            style={searchStyle}
            placeholder="Поиск по логину или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          
          {isLoading ? (
            <div style={{ padding: '0.75rem', color: '#666', textAlign: 'center' }}>Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '0.75rem', color: '#888', textAlign: 'center' }}>
              {search ? 'Ничего не найдено' : 'Нет доступных пользователей'}
            </div>
          ) : (
            filtered.map(user => (
              <div
                key={user.id}
                style={itemStyle(user.id === value)}
                onClick={() => handleSelect(user)}
              >
                <div style={{ fontWeight: 500 }}>{user.login}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>{user.email}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  <span style={{ 
                    padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.7rem',
                    background: user.role === 'dept_lead' ? '#fff3cd' : '#e8f5e9',
                    color: user.role === 'dept_lead' ? '#856404' : '#155724'
                  }}>
                    {user.role}
                  </span>
                  {user.status !== 'active' && (
                    <span style={{ marginLeft: '0.5rem', color: '#d32f2f', fontSize: '0.7rem' }}>
                      {user.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};