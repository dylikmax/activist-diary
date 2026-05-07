import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserSelector } from '../components/forms/UserSelector';
import type { DepartmentTree, AttachmentType, TaskPriority, Role } from '../api/types';

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const ATTACHMENT_TYPES: AttachmentType[] = ['photo', 'video', 'text', 'file'];

// 🔐 Права на назначение задач
const CAN_ASSIGN_TO_OTHERS: Role[] = ['dept_lead', 'secretary', 'vice_chair', 'chair', 'admin'];

export const TaskFormPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // 🔥 Получаем текущего пользователя
  
  const [form, setForm] = useState({
    title: '',
    assignee_id: '',
    department_id: '',
    description: '',
    priority: 'medium' as TaskPriority,
    deadline: '',
    attachment_req: [] as AttachmentType[],
    is_recurring: false,
    recurrence_rule: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // 🔥 Авто-назначение себе для обычных активистов
  if (user && !CAN_ASSIGN_TO_OTHERS.includes(user.role) && !form.assignee_id) {
    form.assignee_id = user.id;
  }

  // Загружаем отделы
  const { data: departments } = useQuery({
    queryKey: ['departments-flat'],
    queryFn: async () => {
      const res = await api.get('/departments', { params: { expand: true } });
      const tree = res.data.data as DepartmentTree[];
      const flat: { id: string; name: string }[] = [];
      const flatten = (nodes: DepartmentTree[]) => nodes.forEach(n => {
        flat.push({ id: n.id, name: n.name });
        if (n.children) flatten(n.children);
      });
      flatten(tree);
      return flat;
    }
  });

  const set = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const toggleAttachment = (type: AttachmentType, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      attachment_req: checked ? [...prev.attachment_req, type] : prev.attachment_req.filter(t => t !== type)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const payload = {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        attachment_req: form.attachment_req.length > 0 ? form.attachment_req : null,
        is_recurring: form.is_recurring,
        recurrence_rule: form.is_recurring ? form.recurrence_rule : null,
        department_id: form.department_id || null,
      };
      await api.post('/tasks', payload);
      navigate('/tasks', { replace: true });
    } catch (err: any) {
      if (err.validationErrors) {
        const formatted: Record<string, string> = {};
        err.validationErrors.forEach((d: any) => (formatted[d.field] = d.message));
        setErrors(formatted);
      } else {
        setErrors({ form: err.response?.data?.errors?.message || 'Ошибка создания задачи' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', marginBottom: '0.25rem' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem', fontWeight: 500 };
  const errorStyle: React.CSSProperties = { color: '#d32f2f', fontSize: '0.85rem', marginBottom: '0.5rem' };
  const infoBoxStyle: React.CSSProperties = {
    padding: '0.75rem', background: '#e3f2fd', borderRadius: 6, border: '1px solid #bbdefb',
    fontSize: '0.9rem', color: '#0d47a1', marginBottom: '0.75rem'
  };

  const canAssignToOthers = user ? CAN_ASSIGN_TO_OTHERS.includes(user.role) : false;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '2rem auto', padding: '1.5rem', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
      <h2 style={{ marginBottom: '1rem' }}>Создать задачу</h2>
      {errors.form && <p style={errorStyle}>{errors.form}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Название *</label>
          <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} required />
          {errors.title && <p style={errorStyle}>{errors.title}</p>}
        </div>

        {/* 🔐 Поле исполнителя: скрыто для activist, видно для руководителей */}
        <div>
          {canAssignToOthers ? (
            <>
              <label style={labelStyle}>Исполнитель *</label>
              <UserSelector
                value={form.assignee_id}
                onChange={(userId) => set('assignee_id', userId)}
                placeholder="Выберите исполнителя..."
                requiredRoles={['activist', 'dept_lead']}
              />
              {errors.assignee_id && <p style={errorStyle}>{errors.assignee_id}</p>}
            </>
          ) : (
            <>
              <label style={labelStyle}>Исполнитель</label>
              <div style={infoBoxStyle}>
                Задача будет назначена вам: <b>{user?.login}</b>
              </div>
              {/* Скрытый инпут для отправки своего ID */}
              <input type="hidden" name="assignee_id" value={user?.id || ''} />
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Отдел</label>
        <select style={inputStyle} value={form.department_id} onChange={e => set('department_id', e.target.value)}>
          <option value="">Не выбрано</option>
          {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Описание</label>
        <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Приоритет</label>
          <select style={inputStyle} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Дедлайн</label>
          <input type="datetime-local" style={inputStyle} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          {errors.deadline && <p style={errorStyle}>{errors.deadline}</p>}
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Требуются вложения:</label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {ATTACHMENT_TYPES.map(type => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <input type="checkbox" checked={form.attachment_req.includes(type)} onChange={e => toggleAttachment(type, e.target.checked)} />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} />
          Повторяющаяся задача
        </label>
        {form.is_recurring && (
          <input style={{ ...inputStyle, marginTop: '0.5rem' }} placeholder="RRULE (напр. FREQ=WEEKLY)" value={form.recurrence_rule} onChange={e => set('recurrence_rule', e.target.value)} />
        )}
      </div>

      <button type="submit" disabled={loading} style={{ padding: '0.6rem 1.5rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Создание...' : 'Создать задачу'}
      </button>
    </form>
  );
};