import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import Notice from '../../components/Notice';
import { optimizeProfileImage } from '../../utils/profileImage';
import PasswordRequirements from '../../components/PasswordRequirements';
import { meetsPasswordRequirements } from '../../utils/passwordStrength';

export default function AdminAddCoach() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', specialty: '', bio: '', phone_number: '', image: null });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!meetsPasswordRequirements(form.password)) {
      setError('Please meet all password requirements.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => value !== null && fd.append(key, value));
      await api.postForm('/api/admin/coaches/add', fd);
      navigate('/admin/coaches');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-4xl">Add Coach</h1>
      {error && <Notice type="error" message={error} onDismiss={() => setError(null)} />}
      <form onSubmit={submit} className="space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4">
          <input name="first_name" required placeholder="First name" value={form.first_name} onChange={onChange} className="bg-dark border border-dark-600 rounded-xl px-4 py-3" />
          <input name="last_name" required placeholder="Last name" value={form.last_name} onChange={onChange} className="bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        </div>
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={onChange} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <input name="password" type="password" required placeholder="Password" value={form.password} onChange={onChange} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <PasswordRequirements password={form.password} />
        <input name="phone_number" type="tel" placeholder="Phone number" value={form.phone_number} onChange={onChange} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <label className="block text-sm text-gray-400">Profile photo <input name="image" type="file" accept="image/*" onChange={async (e) => { try { setForm({ ...form, image: await optimizeProfileImage(e.target.files?.[0]) }); } catch (err) { setError(err.message); } }} className="block mt-1 text-sm" /></label>
        <input name="specialty" placeholder="Specialty" value={form.specialty} onChange={onChange} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <textarea name="bio" placeholder="Bio" value={form.bio} onChange={onChange} rows={3} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <button disabled={busy} className="w-full bg-brand text-dark font-bold px-6 py-3 rounded-xl">{busy ? 'Creating...' : 'Create Coach'}</button>
      </form>
    </div>
  );
}
