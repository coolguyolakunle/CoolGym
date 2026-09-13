import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import Notice from '../../components/Notice';
import Avatar from '../../components/Avatar';
import PasswordRequirements from '../../components/PasswordRequirements';
import { meetsPasswordRequirements } from '../../utils/passwordStrength';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await api.get(`/api/admin/users/${userId}`);
    setData(d);
    setForm({ first_name: d.user.first_name, last_name: d.user.last_name, email: d.user.email, phone_number: d.user.phone_number || '', membership: d.user.membership, new_password: '' });
  };

  useEffect(() => { load(); }, [userId]);

  const update = async (e) => {
    e.preventDefault();
    if (form.new_password && !meetsPasswordRequirements(form.new_password)) {
      setNotice({ type: 'error', message: 'Please meet all password requirements.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await api.post(`/api/admin/users/${userId}`, { action: 'update', ...form });
      setNotice({ type: 'success', message: 'Member updated.' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this member? This cannot be undone.')) return;
    try {
      await api.post(`/api/admin/users/${userId}`, { action: 'delete' });
      navigate('/admin/users');
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const revokeMembership = async () => {
    if (!confirm('Revoke this member\'s membership?')) return;
    try { await api.post(`/api/admin/users/${userId}/revoke-membership`); setNotice({ type: 'success', message: 'Membership revoked.' }); await load(); }
    catch (err) { setNotice({ type: 'error', message: err.message }); }
  };

  if (!data || !form) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl min-w-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4"><Avatar user={data.user} size={16} /><div className="min-w-0"><h1 className="break-words font-display text-4xl leading-none">{data.user.full_name}</h1><p className="text-gray-400 text-sm break-all mt-1">{data.user.phone_number || 'No phone number'}</p></div></div>
      {notice && <Notice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />}

      <form onSubmit={update} className="space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-4 py-3" placeholder="First name" />
          <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-4 py-3" placeholder="Last name" />
        </div>
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" placeholder="Email" />
        <input type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" placeholder="Phone number" />
        <select value={form.membership} onChange={(e) => setForm({ ...form, membership: e.target.value })} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3">
          <option value="none">None</option>
          <option value="basic">Basic</option>
          <option value="elite">Elite</option>
          <option value="pro">Pro</option>
        </select>
        <input type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" placeholder="New password (optional)" />
        {form.new_password && <PasswordRequirements password={form.new_password} />}
        <div className="flex flex-col sm:flex-row gap-3">
          <button disabled={busy} className="w-full sm:w-auto bg-brand text-dark font-bold px-6 py-3 rounded-xl">{busy ? 'Saving...' : 'Save Changes'}</button>
          <button type="button" onClick={remove} className="w-full sm:w-auto border border-red-800 text-red-400 font-bold px-6 py-3 rounded-xl hover:bg-red-950">Delete Member</button>
          {data.user.membership !== 'none' && <button type="button" onClick={revokeMembership} className="w-full sm:w-auto border border-orange-700 text-orange-300 font-bold px-6 py-3 rounded-xl">Revoke Membership</button>}
        </div>
      </form>

      {data.assignment && (
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-4 sm:p-6">
          <h2 className="font-display text-2xl mb-2">Assigned Coach</h2>
          <p className="text-gray-400">{data.assignment.coach?.full_name}</p>
        </div>
      )}

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-4 sm:p-6">
        <h2 className="font-display text-2xl mb-4">Booking History</h2>
        <ul className="space-y-2 text-sm">
          {data.bookings.map((b) => (
            <li key={b.id} className="flex justify-between"><span className="capitalize">{b.plan}</span><span className="text-gray-500 capitalize">{b.status}</span></li>
          ))}
          {data.bookings.length === 0 && <li className="text-gray-500">No bookings yet.</li>}
        </ul>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-4 sm:p-6">
        <h2 className="font-display text-2xl mb-4">Workout Plans & Progress</h2>
        <ul className="space-y-2 text-sm">{data.plans.map((p) => <li key={p.id}><span className="font-semibold">{p.title}</span> — {p.weeks} weeks ({p.is_active ? 'Active' : 'Inactive'})</li>)}{data.plans.length === 0 && <li className="text-gray-500">No workout plans.</li>}</ul>
        <h3 className="font-semibold mt-5 mb-2">Progress logs</h3><ul className="space-y-2 text-sm">{data.logs.map((l) => <li key={l.id}>Week {l.week}: {l.weight_kg ? `${l.weight_kg} kg · ` : ''}{l.sessions || 0} sessions {l.note && `· ${l.note}`}</li>)}{data.logs.length === 0 && <li className="text-gray-500">No progress logged.</li>}</ul>
      </div>
    </div>
  );
}
