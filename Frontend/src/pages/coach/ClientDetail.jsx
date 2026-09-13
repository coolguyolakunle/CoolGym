import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import Avatar from '../../components/Avatar';
import Notice from '../../components/Notice';

export default function CoachClientDetail() {
  const { clientId } = useParams();
  const [data, setData] = useState(null);
  const [planForm, setPlanForm] = useState({ title: '', description: '', weeks: 4 });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setData(await api.get(`/api/coach/clients/${clientId}`));
  useEffect(() => { load(); }, [clientId]);

  const createPlan = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api.post('/api/coach/plans/create', { ...planForm, client_id: clientId });
      setNotice({ type: 'success', message: 'Plan created!' });
      setPlanForm({ title: '', description: '', weeks: 4 });
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const togglePlan = async (id) => {
    await api.post(`/api/coach/plans/${id}/toggle`);
    await load();
  };

  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    await api.post(`/api/coach/plans/${id}/delete`);
    await load();
  };

  if (!data) return <p className="text-gray-500">Loading...</p>;
  const client = data.assignment.client;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar user={client} size={16} />
        <div>
          <h1 className="font-display text-4xl">{client.full_name}</h1>
          <p className="text-gray-500 text-sm">{client.email}</p>
          {client.phone_number && <a href={`tel:${client.phone_number}`} className="text-brand text-sm">{client.phone_number}</a>}
        </div>
        <Link to={`/messages/${client.id}`} className="ml-auto bg-brand text-dark font-semibold px-4 py-2 rounded-xl text-sm">Message</Link>
        <Link to={`/calls/${client.id}`} className="border border-dark-600 font-semibold px-4 py-2 rounded-xl text-sm hover:border-brand hover:text-brand">
          <i className="fa-solid fa-video mr-1" /> Call
        </Link>
      </div>

      {notice && <Notice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />}

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">New Workout Plan</h2>
        <form onSubmit={createPlan} className="grid md:grid-cols-4 gap-3 items-end">
          <input required placeholder="Title" value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-3 py-2 md:col-span-2" />
          <input type="number" min={1} placeholder="Weeks" value={planForm.weeks} onChange={(e) => setPlanForm({ ...planForm, weeks: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-3 py-2" />
          <button disabled={busy} className="bg-brand text-dark font-semibold px-4 py-2 rounded-xl">{busy ? 'Creating...' : 'Create Plan'}</button>
          <textarea placeholder="Description" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} className="bg-dark border border-dark-600 rounded-xl px-3 py-2 md:col-span-4" rows={2} />
        </form>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">Workout Plans</h2>
        <ul className="space-y-3">
          {data.plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b border-dark-600 pb-3 last:border-0">
              <div>
                <p className="font-semibold">{p.title} <span className={`text-xs ml-2 ${p.is_active ? 'text-green-400' : 'text-gray-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></p>
                <p className="text-xs text-gray-500">{p.weeks} weeks &middot; {p.description}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => togglePlan(p.id)} className="text-brand hover:underline">{p.is_active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => deletePlan(p.id)} className="text-red-400 hover:underline">Delete</button>
              </div>
            </li>
          ))}
          {data.plans.length === 0 && <li className="text-gray-500 text-sm">No plans yet.</li>}
        </ul>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">Progress Logs</h2>
        <ul className="space-y-2 text-sm">
          {data.logs.map((l) => (
            <li key={l.id} className="flex flex-wrap gap-x-4 text-gray-400">
              <span className="font-semibold text-white">Week {l.week}</span>
              {l.weight_kg && <span>{l.weight_kg} kg</span>}
              {l.sessions ? <span>{l.sessions} sessions</span> : null}
              {l.note && <span>{l.note}</span>}
            </li>
          ))}
          {data.logs.length === 0 && <li className="text-gray-500">No logs yet.</li>}
        </ul>
      </div>
    </div>
  );
}
