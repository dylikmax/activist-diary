import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Task, TaskStatus, Comment, Attachment, AttachmentType } from '../api/types';

// 📦 Маппинг MIME → тип вложения
const getAttachmentType = (mimeType: string): AttachmentType => {
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('text/')) return 'text';
  return 'file';
};

// 🔄 Разрешённые переходы статусов
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  new: ['in_progress'],
  in_progress: ['under_review'],
  under_review: ['completed', 'rejected'],
  rejected: ['in_progress'],
  completed: ['archived'],
  archived: [],
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая', in_progress: 'В работе', under_review: 'На проверке',
  completed: 'Выполнена', rejected: 'Отклонена', archived: 'Архив'
};

export const TaskDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; file: File; status: 'pending' | 'uploading' | 'success' | 'error'; error?: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📦 Загрузка задачи
const { data: task, isLoading: taskLoading, error: taskError } = useQuery({
  queryKey: ['task', id],
  queryFn: async () => {
    if (!id) throw new Error('ID задачи отсутствует');
    const res = await api.get(`/tasks/${id}`);
    if (!res.data.success || !res.data.data) throw new Error(res.data.errors?.message || 'Задача не найдена');
    return res.data.data as Task;
  },
  enabled: !!id,
  retry: 1,
});

  // 💬 Комментарии (исправлено: парсинг обёртки ответа)
const { data: comments, isLoading: commentsLoading, error: commentsError } = useQuery<Comment[]>({
  queryKey: ['comments', id],
  queryFn: async () => {
    if (!id) return [];
    const res = await api.get('/comments', { params: { task_id: id } });
    if (!res.data.success) throw new Error(res.data.errors?.message || 'Ошибка загрузки комментариев');
    return Array.isArray(res.data.data) ? res.data.data : [];
  },
  enabled: !!id,
  retry: 1,
});

  // 📎 Вложения (исправлено: парсинг обёртки ответа)
const { data: attachments, isLoading: attachmentsLoading, error: attachmentsError } = useQuery<Attachment[]>({
  queryKey: ['attachments', id],
  queryFn: async () => {
    if (!id) return [];
    const res = await api.get('/attachments', { params: { task_id: id } });
    if (!res.data.success) throw new Error(res.data.errors?.message || 'Ошибка загрузки вложений');
    return Array.isArray(res.data.data) ? res.data.data : [];
  },
  enabled: !!id,
  retry: 1,
});

  // 🔄 Смена статуса
  const updateStatus = useMutation({
    mutationFn: async (status: TaskStatus) => {
      await api.patch(`/tasks/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['attachments', id] });
    }
  });

  // 💬 Добавить комментарий
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      await api.post('/comments', { task_id: id, content });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });

  // 📎 Загрузка файлов (multipart/form-data)
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;

    const newFiles = Array.from(files).map(f => ({
      id: `${Date.now()}-${f.name}`,
      file: f,
      status: 'pending' as const
    }));
    setUploadingFiles(prev => [...prev, ...newFiles]);

    for (const item of newFiles) {
      setUploadingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));
      try {
        const type = getAttachmentType(item.file.type);
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('task_id', id);
        formData.append('type', type);

        const res = await api.post('/attachments/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        // Если бэк вернул созданное вложение — добавляем в кэш мгновенно
        if (res.data.success && res.data.data) {
          queryClient.setQueryData(['attachments', id], (old: Attachment[] = []) => [
            ...old,
            res.data.data as Attachment
          ]);
        }
        setUploadingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success' } : f));
      } catch (err: any) {
        console.error('❌ Upload error:', err);
        setUploadingFiles(prev => prev.map(f => f.id === item.id ? { 
          ...f, status: 'error', error: err.response?.data?.errors?.message || 'Ошибка загрузки' 
        } : f));
      }
    }

    queryClient.invalidateQueries({ queryKey: ['attachments', id] });
    setTimeout(() => setUploadingFiles(prev => prev.filter(f => f.status === 'uploading' || f.status === 'error')), 3000);
  }, [id, queryClient]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); };

  const handleStatusClick = (status: TaskStatus) => updateStatus.mutate(status);
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate(commentText, { onSuccess: () => setCommentText('') });
  };

  // 🛡️ Рендер состояний
  if (taskLoading) return <div className="loading-spinner">Загрузка задачи...</div>;
  if (taskError) {
    const msg = (taskError as any).response?.data?.errors?.message || (taskError as Error).message || 'Ошибка';
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: '#fff', borderRadius: 8 }}>
        <h3 style={{ color: '#d32f2f' }}>⚠️ {msg}</h3>
        <button onClick={() => navigate('/tasks')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 6 }}>К списку</button>
      </div>
    );
  }
  if (!task) return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Задача не найдена</div>;

  const allowedTransitions = STATUS_TRANSITIONS[task.status] || [];
  const isOverdue = task.deadline ? new Date(task.deadline) < new Date() && !['completed', 'archived'].includes(task.status) : false;

  // 🎨 Стили
  const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${isDragging ? '#0066cc' : '#ccc'}`,
    background: isDragging ? '#f0f7ff' : '#fafafa',
    padding: '2rem', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
    marginBottom: '1rem', transition: 'all 0.2s'
  };
  const fileStatusColor = (s: string) => s === 'success' ? '#4caf50' : s === 'error' ? '#d32f2f' : s === 'uploading' ? '#ff9800' : '#888';
  const badge = (color: string, text: string) => (
    <span style={{ padding: '0.2rem 0.5rem', background: color + '20', color, borderRadius: 4, fontSize: '0.8rem' }}>{text}</span>
  );

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '1.5rem', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
      {/* Шапка */}
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h1 style={{ margin: '0 0 0.5rem' }}>{task.title}</h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#666' }}>
          <span>Статус: <b>{STATUS_LABELS[task.status]}</b></span>
          <span>Приоритет: {task.priority}</span>
          <span style={{ color: isOverdue ? '#d32f2f' : '#333' }}>Дедлайн: {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU') : '—'}</span>
          {isOverdue && <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>Просрочена</span>}
          <span>{task.assignee_login || task.assignee_id}</span>
          {task.department_name && <span>{task.department_name}</span>}
        </div>
      </header>

      {/* Описание */}
      <section style={sectionStyle}>
        <h3>Описание</h3>
        <p style={{ whiteSpace: 'pre-wrap', color: '#444' }}>{task.description || 'Нет описания'}</p>
      </section>

      {/* Статусы */}
      {allowedTransitions.length > 0 && (
        <section style={sectionStyle}>
          <h3>Изменить статус</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {allowedTransitions.map(s => (
              <button key={s} onClick={() => handleStatusClick(s)} disabled={updateStatus.isPending}
                style={{ padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 📎 Вложения */}
      <section style={sectionStyle}>
        <h3>Вложения</h3>
        
        {/* Drop Zone */}
        <div style={dropZoneStyle} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => handleFileUpload(e.target.files)} />
          <p style={{ margin: 0, color: '#555' }}>Перетащите файлы или <b style={{ color: '#0066cc' }}>нажмите</b></p>
          {task.attachment_req?.length > 0 && <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>Требуется: {task.attachment_req.join(', ')}</small>}
        </div>

        {/* Загружаемые файлы */}
        {uploadingFiles.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
            {uploadingFiles.map(f => (
              <li key={f.id} style={{ padding: '0.5rem', background: '#f8f9fa', borderRadius: 4, marginBottom: '0.3rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>📄 {f.file.name} <small style={{ color: '#888' }}>({(f.file.size/1024).toFixed(1)} KB)</small></span>
                <span style={{ color: fileStatusColor(f.status), fontWeight: 500 }}>
                  {f.status === 'uploading' ? '⏳' : f.status === 'success' ? '✅' : `❌ ${f.error}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Существующие вложения */}
        {attachmentsLoading ? <div style={{ color: '#666' }}>Загрузка вложений...</div> :
         attachmentsError ? <div style={{ color: '#d32f2f', fontSize: '0.9rem' }}>Не удалось загрузить вложения</div> :
         attachments?.length === 0 && uploadingFiles.length === 0 ? <p style={{ color: '#888' }}>Нет вложений</p> :
         <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
           {attachments?.map(a => (
             <li key={a.id} style={{ padding: '0.5rem', background: '#f0f4f8', borderRadius: 4, fontSize: '0.85rem', border: '1px solid #b0c4de' }}>
               {badge(a.type === 'photo' ? '#2196f3' : a.type === 'video' ? '#9c27b0' : '#607d8b', a.type)}{' '}
               {(a.size_bytes/1024).toFixed(1)} KB{' '}
               {badge(a.status === 'approved' ? '#4caf50' : a.status === 'rejected' ? '#f44336' : '#ff9800', a.status)}
             </li>
           ))}
         </ul>
        }
      </section>

      {/* 💬 Комментарии */}
      <section>
        <h3>Комментарии</h3>
        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input style={{ flex: 1, padding: '0.5rem', borderRadius: 6, border: '1px solid #ccc' }} placeholder="Написать..." value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={addComment.isPending} />
          <button type="submit" disabled={addComment.isPending || !commentText.trim()} style={{ padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {addComment.isPending ? '...' : '➤'}
          </button>
        </form>
        
        {commentsLoading ? <div style={{ color: '#666' }}>Загрузка комментариев...</div> :
         commentsError ? <div style={{ color: '#d32f2f', fontSize: '0.9rem' }}>Не удалось загрузить комментарии</div> :
         comments?.length === 0 ? <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>Пока нет комментариев</div> :
         <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6 }}>
           {comments?.map(c => (
             <div key={c.id} style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
               <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                 <b>{c.author_login}</b> <span style={{ fontSize: '0.75rem' }}>({c.author_role})</span> • {new Date(c.created_at).toLocaleString('ru-RU')}
               </div>
               <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
             </div>
           ))}
         </div>
        }
      </section>
    </div>
  );
};