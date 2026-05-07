import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { DepartmentTree } from '../api/types';

// 🌳 Рекурсивный компонент узла
const DepartmentNode = ({ dept, depth = 0 }: { dept: DepartmentTree; depth?: number }) => {
  const hasChildren = dept.children && dept.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 24, marginTop: depth > 0 ? '0.5rem' : 0 }}>
      <div style={{
        padding: '0.75rem 1rem',
        background: '#fff',
        borderRadius: 6,
        border: '1px solid #e0e0e0',
        borderLeft: depth === 0 ? '4px solid #0066cc' : '4px solid #a0a0a0',
        position: 'relative'
      }}>
        {/* Визуальный маркер ветки */}
        {depth > 0 && (
          <span style={{ position: 'absolute', left: -16, top: 8, color: '#999', fontSize: '1.4rem', lineHeight: 1 }}>└</span>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{dept.name}</h3>
            {dept.description && (
              <p style={{ margin: '0.25rem 0 0', color: '#555', fontSize: '0.9rem' }}>{dept.description}</p>
            )}
            <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: '#888' }}>
              👤 {dept.leader_id ? 'Руководитель назначен' : 'Руководитель не назначен'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to={`/departments/${dept.id}`} style={linkStyle}>Подробнее</Link>
            <Link to={`/departments/${dept.id}/manage`} style={{ ...linkStyle, background: '#f0f4f8', color: '#0055aa', borderColor: '#b0c4de' }}>
              Управление
            </Link>
          </div>
        </div>
      </div>

      {/* Рекурсивный рендер детей */}
      {hasChildren && (
        <div style={{ marginTop: '0.25rem' }}>
          {dept.children!.map(child => (
            <DepartmentNode key={child.id} dept={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const linkStyle: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  background: '#0066cc',
  color: '#fff',
  textDecoration: 'none',
  borderRadius: 4,
  fontSize: '0.85rem',
  fontWeight: 500
};

export const DepartmentTreePage = () => {
  const { data: departments, isLoading, error } = useQuery({
    queryKey: ['departments-tree'],
    queryFn: async () => {
      const res = await api.get('/departments', { params: { expand: true } });
      return res.data.data as DepartmentTree[];
    }
  });

  if (isLoading) return <div className="loading-spinner">Загрузка структуры...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#d32f2f' }}>Ошибка загрузки: {error.message}</div>;
  
  if (!departments || departments.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
        <h3>Структура отделов пуста</h3>
        <p>Создайте первый отдел через панель администратора</p>
        <Link to="/admin/departments" style={{ ...linkStyle, display: 'inline-block', marginTop: '1rem' }}>
          + Создать отдел
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Структура отделов</h2>
        <Link to="/admin/departments" style={linkStyle}>+ Добавить отдел</Link>
      </div>
      
      {/* Корневые узлы дерева */}
      {departments.map(dept => (
        <DepartmentNode key={dept.id} dept={dept} />
      ))}
    </div>
  );
};