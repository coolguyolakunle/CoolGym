import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Avatar from '../../components/Avatar';

export default function CoachDashboard() {
  const [d, setD] = useState(null);

  useEffect(() => { api.get('/api/coach/dashboard').then(setD); }, []);

  if (!d) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Coach Dashboard</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-5">
          <p className="text-3xl font-display">{d.total}</p>
          <p className="text-xs text-gray-500">Total Clients</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-5">
          <p className="text-3xl font-display">{d.active}</p>
          <p className="text-xs text-gray-500">Active Members</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-5">
          <p className="text-3xl font-display">{d.unread_count}</p>
          <p className="text-xs text-gray-500">Unread Messages</p>
        </div>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-2xl">My Clients</h2>
          <Link to="/coach/clients" className="text-brand text-sm font-semibold">View all</Link>
        </div>
        <ul className="space-y-3">
          {d.clients.slice(0, 6).map((c) => (
            <li key={c.id}>
              <Link to={`/coach/clients/${c.client.id}`} className="flex items-center gap-3 hover:text-brand">
                <Avatar user={c.client} size={9} />
                <span>{c.client.full_name}</span>
              </Link>
            </li>
          ))}
          {d.clients.length === 0 && <li className="text-gray-500 text-sm">No clients assigned yet.</li>}
        </ul>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">Recent Progress Logs</h2>
        <ul className="space-y-2 text-sm">
          {d.recent_logs.map((l) => (
            <li key={l.id} className="text-gray-400">Week {l.week} &middot; {l.weight_kg ? `${l.weight_kg}kg` : ''} {l.note}</li>
          ))}
          {d.recent_logs.length === 0 && <li className="text-gray-500">No logs yet.</li>}
        </ul>
      </div>
    </div>
  );
}
