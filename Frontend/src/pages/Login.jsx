import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Notice from '../components/Notice';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(form.email, form.password, form.remember);
      const dest = location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : user.role === 'coach' ? '/coach' : '/dashboard');
      navigate(dest, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setBusy(true);
    setError(null);
    try {
      const user = await googleLogin(credential);
      const dest = location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : user.role === 'coach' ? '/coach' : '/dashboard');
      navigate(dest, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-5xl mb-2">Welcome back.</h1>
        <p className="text-gray-400 text-sm">Log in to your CoolGym account.</p>
      </div>

      {error && <Notice type="error" message={error} onDismiss={() => setError(null)} />}

      <form onSubmit={onSubmit} className="space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-8">
        <input type="email" required placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <input type="password" required placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
          Remember me
        </label>
        <button disabled={busy} className="w-full bg-brand text-dark font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60">
          {busy ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-gray-500"><span className="h-px flex-1 bg-dark-600" />or<span className="h-px flex-1 bg-dark-600" /></div>
        <GoogleSignInButton onCredential={onGoogleCredential} onError={(e) => setError(e.message)} />
      </div>

      <p className="text-center text-sm text-gray-500">
        No account yet? <Link to="/register" className="text-brand">Register</Link>
      </p>
    </div>
  );
}
