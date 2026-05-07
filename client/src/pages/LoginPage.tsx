import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [formData, setFormData] = useState({ login: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');
    setIsLoading(true);

    try {
      await login(formData);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.validationErrors) {
        const formatted: Record<string, string> = {};
        err.validationErrors.forEach((d: any) => (formatted[d.field] = d.message));
        setFieldErrors(formatted);
      } else {
        setGeneralError(err.response?.data?.errors?.message || 'Ошибка авторизации');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '3rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Вход</h2>
      {generalError && <p style={{ color: '#d32f2f', marginBottom: '0.5rem' }}>{generalError}</p>}
      
      <div style={{ marginBottom: '0.75rem' }}>
        <label>Логин:</label><br />
        <input
          style={{ width: '100%', padding: '0.4rem' }}
          value={formData.login}
          onChange={(e) => setFormData({ ...formData, login: e.target.value })}
        />
        {fieldErrors.login && <small style={{ color: '#d32f2f' }}>{fieldErrors.login}</small>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Пароль:</label><br />
        <input
          type="password"
          style={{ width: '100%', padding: '0.4rem' }}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        {fieldErrors.password && <small style={{ color: '#d32f2f' }}>{fieldErrors.password}</small>}
      </div>

      <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '0.5rem' }}>
        {isLoading ? 'Вход...' : 'Войти'}
      </button>

      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Link to="/register">Нет аккаунта? Регистрация</Link>
      </p>
    </form>
  );
};