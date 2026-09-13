import { useEffect, useState } from 'react';
import { api } from '../../api';
import Notice from '../../components/Notice';

export default function AdminAssign() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ coach_id: '', client_id: '', notes: '' });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setData(await api.get('/api/admin/assign'));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api.post('/api/admin/assign', form);
      setNotice({ type: 'success', message: 'Client assigned!' });
      setForm({ coach_id: '', client_id: '', notes: '' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (aid) => {
    await api.post(`/api/admin/assign/${aid}/remove`);
    await load();
  };

  if (!data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Assign Clients</h1>
      {notice && <Notice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />}

      <form onSubmit={submit} className="grid md:grid-cols-4 gap-3 items-end bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <select required value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-3 py-3">
          <option value="">Select coach</option>
          {data.coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
        <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-3 py-3">
          <option value="">Select member</option>
          {data.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-3 py-3" />
        <button disabled={busy} className="bg-brand text-dark font-bold px-4 py-3 rounded-xl">{busy ? 'Assigning...' : 'Assign'}</button>
      </form>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">Active Assignments</h2>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
            <tr><th className="pb-2">Coach</th><th className="pb-2">Member</th><th className="pb-2">Notes</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-dark-600">
            {data.assignments.map((a) => (
              <tr key={a.id}>
                <td className="py-2">{a.coach?.full_name}</td>
                <td className="py-2">{a.client?.full_name}</td>
                <td className="py-2 text-gray-500">{a.notes}</td>
                <td className="py-2 text-right"><button onClick={() => remove(a.id)} className="text-red-400 text-xs hover:underline">Remove</button></td>
              </tr>
            ))}
            {data.assignments.length === 0 && <tr><td colSpan={4} className="py-4 text-gray-500">No assignments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
