import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { DepartmentTree } from '../api/types';

export const AdminDepartmentPage = () => {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    parent_id: '',
    default_attachment_req: [] as string[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // 📦 Загрузка и flatt-ение дерева
  const { data: departments, isLoading } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const res = await api.get('/departments', { params: { expand: true } });
      if (!res.data.success) throw new Error(res.data.errors?.message);
      
      const flat: any[] = [];
      const flatten = (nodes: DepartmentTree[], depth = 0) => {
        nodes.forEach(n => {
          flat.push({ ...n, depth });
          if (n.children?.length) flatten(n.children, depth + 1);
        });
      };
      flatten(res.data.data);
      return flat;
    },
    retry: 1
  });

  const handleApiError = (err: any) => {
    console.error('🔥 API Error:', err);
    if (err.validationErrors) {
      const formatted: Record<string, string> = {};
      err.validationErrors.forEach((d: any) => (formatted[d.field] = d.message));
      setErrors(formatted);
    } else {
      setErrors({ form: err.response?.data?.errors?.message || 'Ошибка запроса' });
    }
    setTimeout(() => setErrors({}), 5000);
  };

  const saveDept = useMutation({
    mutationFn: async () => {
      // 🗑️ Удаляем UI-поля перед отправкой на бэк
      const { depth, children, ...cleanForm } = form as any;
      const payload = { 
        ...cleanForm, 
        parent_id: cleanForm.parent_id || null,
        default_attachment_req: cleanForm.default_attachment_req.length > 0 ? cleanForm.default_attachment_req : null
      };
      return editingId 
        ? api.patch(`/departments/${editingId}`, payload)
        : api.post('/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setForm({ name: '', description: '', parent_id: '', default_attachment_req: [] });
      setEditingId(null);
      setSuccessMsg(editingId ? '✅ Отдел обновлён' : '✅ Отдел создан');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: handleApiError
  });

  const deleteDept = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-departments'] }),
    onError: handleApiError
  });

  const set = (field: string, val: any) => setForm(f => ({ ...f, [field]: val }));
  const toggleAttachment = (type: string, checked: boolean) => {
    setForm(f => ({
      ...f,
      default_attachment_req: checked ? [...f.default_attachment_req, type] : f.default_attachment_req.filter(t => t !== type)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMsg('');
    saveDept.mutate();
  };

  const handleEdit = (dept: any) => {
    try {
      setEditingId(dept.id);
      setForm({
        name: dept.name || '',
        description: dept.description || '',
        parent_id: dept.parent_id || '',
        default_attachment_req: Array.isArray(dept.default_attachment_req) ? dept.default_attachment_req : []
      });
      // Скролл к форме для UX
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('💥 HandleEdit error:', err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', description: '', parent_id: '', default_attachment_req: [] });
  };

  if (isLoading) return <div className="loading-spinner">Загрузка отделов...</div>;

  const sectionStyle: React.CSSProperties = { background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: '1.25rem', marginBottom: '1.5rem' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', marginBottom: '0.25rem' };
  const errorStyle: React.CSSProperties = { color: '#d32f2f', fontSize: '0.85rem', marginBottom: '0.5rem' };
  const successStyle: React.CSSProperties = { color: '#4caf50', fontSize: '0.9rem', marginBottom: '0.75rem' };
  const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: '0.5rem' };
  const btnSecondary: React.CSSProperties = { padding: '0.5rem 1rem', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' };
  const btnDanger: React.CSSProperties = { padding: '0.4rem 0.8rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };

  return (
    <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Управление отделами</h2>
      {successMsg && <p style={successStyle}>{successMsg}</p>}
      {errors.form && <p style={errorStyle}>{errors.form}</p>}

      {/* 📝 Форма создания/редактирования */}
      <section style={sectionStyle} ref={formRef}>
        <h3 style={{ margin: '0 0 1rem' }}>{editingId ? 'Редактирование отдела' : 'Создать отдел'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <label>Название *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required />
              {errors.name && <p style={errorStyle}>{errors.name}</p>}
            </div>
            <div>
              <label>Родительский отдел</label>
              <select style={inputStyle} value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
                <option value="">Корневой</option>
                {departments?.map(d => <option key={d.id} value={d.id} disabled={d.id === editingId}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label>Описание</label>
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Вложения по умолчанию:</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem' }}>
              {['photo', 'video', 'text', 'file'].map(type => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={form.default_attachment_req.includes(type)} onChange={e => toggleAttachment(type, e.target.checked)} /> {type}
                </label>
              ))}
            </div>
          </div>
          <div>
            <button type="submit" disabled={saveDept.isPending} style={btnPrimary}>
              {saveDept.isPending ? 'Сохранение...' : editingId ? 'Обновить' : 'Создать'}
            </button>
            {editingId && <button type="button" onClick={handleCancel} style={btnSecondary}>Отмена</button>}
          </div>
        </form>
      </section>

      {/* 📋 Таблица отделов */}
      <section style={sectionStyle}>
        <h3 style={{ margin: '0 0 1rem' }}>Список отделов ({departments?.length || 0})</h3>
        {departments?.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>Отделы не созданы</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Название</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Руководитель</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee' }}>Вложения</th>
                  <th style={{ padding: '0.75rem', borderBottom: '2px solid #eee', textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {departments?.map(dept => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem', paddingLeft: (dept.depth || 0) * 1.5 + 0.75 }}>
                      {(dept.depth || 0) > 0 ? <span style={{ color: '#999', marginRight: '0.5rem' }}>└</span> : null}
                      <b>{dept.name}</b>
                      {dept.description && <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>{dept.description}</div>}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#555' }}>{dept.leader_id ? 'Назначен' : '—'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#555' }}>
                      {Array.isArray(dept.default_attachment_req) && dept.default_attachment_req.length > 0 ? dept.default_attachment_req.join(', ') : 'Не заданы'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', display:'flex' }}>
                      <button onClick={() => handleEdit(dept)} style={{ ...btnSecondary, marginRight: '0.5rem' }}>✏️</button>
                      <button onClick={() => deleteDept.mutate(dept.id)} disabled={deleteDept.isPending} style={btnDanger}>🗑️</button>
                    </td>
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