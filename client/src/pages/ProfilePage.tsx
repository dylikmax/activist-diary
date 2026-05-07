import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMsg('');

    // Клиентская валидация
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrors({ confirmPassword: 'Пароли не совпадают' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setErrors({ newPassword: 'Минимум 8 символов' });
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setErrors({ newPassword: 'Новый пароль должен отличаться от текущего' });
      return;
    }

    setIsChangingPassword(true);
    try {
      // 🔌 PLACEHOLDER: Эндпоинт пока отсутствует в спецификации.
      // Когда бэкенд будет готов, замени на:
      // await api.post('/auth/change-password', { 
      //   currentPassword: passwordForm.currentPassword, 
      //   newPassword: passwordForm.newPassword 
      // });
      await new Promise(res => setTimeout(res, 800)); // Имитация запроса
      
      setSuccessMsg('✅ Пароль успешно изменён');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      if (err.validationErrors) {
        const formatted: Record<string, string> = {};
        err.validationErrors.forEach((d: any) => (formatted[d.field] = d.message));
        setErrors(formatted);
      } else {
        setErrors({ form: err.response?.data?.errors?.message || 'Ошибка при смене пароля' });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const set = (field: string, val: string) => setPasswordForm(prev => ({ ...prev, [field]: val }));

  const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: '1.5rem', marginBottom: '1.5rem' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', marginBottom: '0.25rem' };
  const errorStyle: React.CSSProperties = { color: '#d32f2f', fontSize: '0.85rem', marginBottom: '0.5rem' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' };

  if (!user) return <div className="loading-spinner">Загрузка профиля...</div>;

  return (
    <div style={{ maxWidth: 650, margin: '2rem auto', padding: '0 1rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>👤 Профиль</h2>

      {/* 📋 Информация об аккаунте */}
      <section style={cardStyle}>
        <h3 style={{ margin: '0 0 1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Данные аккаунта</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div><div style={{ color: '#666', fontSize: '0.85rem' }}>Логин</div><div style={{ fontWeight: 500 }}>{user.login}</div></div>
          <div><div style={{ color: '#666', fontSize: '0.85rem' }}>Email</div><div style={{ fontWeight: 500 }}>{user.email}</div></div>
          <div><div style={{ color: '#666', fontSize: '0.85rem' }}>Роль</div><div style={{ fontWeight: 500 }}>{user.role}</div></div>
          <div><div style={{ color: '#666', fontSize: '0.85rem' }}>Статус</div><div style={{ fontWeight: 500, color: user.status === 'active' ? '#4caf50' : '#d32f2f' }}>{user.status}</div></div>
          <div><div style={{ color: '#666', fontSize: '0.85rem' }}>Дата регистрации</div><div style={{ fontWeight: 500 }}>{new Date(user.created_at).toLocaleDateString('ru-RU')}</div></div>
        </div>
      </section>

      {/* ⚠️ Действия */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ padding: '0.5rem 1rem', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>← На главную</button>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>🚪 Выйти из аккаунта</button>
      </section>
    </div>
  );
};