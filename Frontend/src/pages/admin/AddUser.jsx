import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import Notice from '../../components/Notice';

export default function AdminAddUser() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', membership: 'none' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/admin/users/add', form);
      navigate('/admin/users');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-4xl">Add Member</h1>
      {error && <Notice type="error" message={error} onDismiss={() => setError(null)} />}
      <form onSubmit={submit} className="space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4">
          <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-4 py-3" />
          <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        </div>
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <p className="rounded-xl border border-dark-600 bg-dark p-3 text-sm text-gray-400">Admins may set a member password that does not meet the normal password requirements.</p>
        <select value={form.membership} onChange={(e) => setForm({ ...form, membership: e.target.value })} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3">
          <option value="none">None</option>
          <option value="basic">Basic</option>
          <option value="elite">Elite</option>
          <option value="pro">Pro</option>
        </select>
        <button disabled={busy} className="w-full bg-brand text-dark font-bold px-6 py-3 rounded-xl">{busy ? 'Creating...' : 'Create Member'}</button>
      </form>
    </div>
  );
}
