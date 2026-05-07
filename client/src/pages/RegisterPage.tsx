import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ login: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setIsLoading(true);

    try {
      await register(formData);
      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      if (err.validationErrors) {
        const formatted: Record<string, string> = {};
        err.validationErrors.forEach((d: any) => (formatted[d.field] = d.message));
        setFieldErrors(formatted);
      } else {
        // Можно добавить обработку общего error, если бэкенд вернёт
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '3rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Регистрация</h2>
      
      <div style={{ marginBottom: '0.75rem' }}>
        <label>Логин:</label><br />
        <input style={{ width: '100%', padding: '0.4rem' }} value={formData.login} onChange={(e) => setFormData({ ...formData, login: e.target.value })} />
        {fieldErrors.login && <small style={{ color: '#d32f2f' }}>{fieldErrors.login}</small>}
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label>Email:</label><br />
        <input type="email" style={{ width: '100%', padding: '0.4rem' }} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        {fieldErrors.email && <small style={{ color: '#d32f2f' }}>{fieldErrors.email}</small>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Пароль:</label><br />
        <input type="password" style={{ width: '100%', padding: '0.4rem' }} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
        {fieldErrors.password && <small style={{ color: '#d32f2f' }}>{fieldErrors.password}</small>}
      </div>

      <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '0.5rem' }}>
        {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>

      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Link to="/login">Уже есть аккаунт? Войти</Link>
      </p>
    </form>
  );
};