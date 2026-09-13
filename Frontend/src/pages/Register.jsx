import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Notice from '../components/Notice';
import PasswordRequirements from '../components/PasswordRequirements';
import { meetsPasswordRequirements } from '../utils/passwordStrength';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Register() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm_password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!meetsPasswordRequirements(form.password)) {
      setError('Please meet all password requirements.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
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
      await googleLogin(credential);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-5xl mb-2">Join CoolGym.</h1>
        <p className="text-gray-400 text-sm">Create your account to get started.</p>
      </div>

      {error && <Notice type="error" message={error} onDismiss={() => setError(null)} />}

      <form onSubmit={onSubmit} className="space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-8">
        <div className="grid grid-cols-2 gap-4">
          <input name="first_name" required placeholder="First name" value={form.first_name} onChange={onChange}
            className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
          <input name="last_name" required placeholder="Last name" value={form.last_name} onChange={onChange}
            className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        </div>
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={onChange}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <input name="password" type="password" required placeholder="Password" value={form.password} onChange={onChange}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <PasswordRequirements password={form.password} />
        <input name="confirm_password" type="password" required placeholder="Confirm password" value={form.confirm_password} onChange={onChange}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <button disabled={busy} className="w-full bg-brand text-dark font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60">
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-gray-500"><span className="h-px flex-1 bg-dark-600" />or<span className="h-px flex-1 bg-dark-600" /></div>
        <GoogleSignInButton onCredential={onGoogleCredential} onError={(e) => setError(e.message)} />
      </div>

      <p className="text-center text-sm text-gray-500">
        Already have an account? <Link to="/login" className="text-brand">Login</Link>
      </p>
    </div>
  );
}
