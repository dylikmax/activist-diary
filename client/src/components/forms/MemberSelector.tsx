import { useState, useRef, useEffect } from 'react';

interface Member {
  id: string;
  login: string;
  email?: string;
  member_role: 'member' | 'lead';
}

interface MemberSelectorProps {
  value: string;
  onChange: (id: string) => void;
  members: Member[];
  isLoading: boolean;
  label?: string;
}

export const MemberSelector = ({ value, onChange, members, isLoading, label }: MemberSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Вычисление один раз, без дублирования в JSX
  const filtered = members.filter(m => 
    m.login.toLowerCase().includes(search.toLowerCase()) || 
    (m.email?.toLowerCase().includes(search.toLowerCase()) || false)
  );
  
  const selected = members.find(m => m.id === value);
  

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {label && <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '0.9rem' }}>{label}</label>}
      
      <div
        onClick={() => { setIsOpen(prev => !prev); setSearch(''); }}
        style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: '#fff', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span>{selected ? `${selected.login} ${selected.member_role === 'lead' ? '👑' : ''}` : 'Выберите участника...'}</span>
        <span style={{ color: '#999' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
          <input
            style={{ width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #eee', outline: 'none', boxSizing: 'border-box' }}
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          
          {isLoading ? (
            <div style={{ padding: 12, color: '#666', textAlign: 'center' }}>Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 12, color: '#888', textAlign: 'center' }}>Не найдено</div>
          ) : (
            filtered.map(m => (
              <div
                key={m.id}
                onClick={() => { onChange(m.id); setIsOpen(false); }}
                style={{ 
                  padding: '8px 12px', cursor: 'pointer', 
                  background: m.id === value ? '#e3f2fd' : 'transparent' 
                }}
              >
                <div style={{ fontWeight: 500 }}>{m.login}</div>
                {m.email && <div style={{ fontSize: '0.8rem', color: '#666' }}>{m.email}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};