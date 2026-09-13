import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Avatar from '../../components/Avatar';

export default function CoachClients() {
  const [clients, setClients] = useState(null);

  useEffect(() => { api.get('/api/coach/clients').then((d) => setClients(d.clients)); }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">My Clients</h1>
      {!clients ? <p className="text-gray-500">Loading...</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Link key={c.id} to={`/coach/clients/${c.client.id}`} className="bg-dark-800 border border-dark-600 rounded-2xl p-5 hover:border-brand flex items-center gap-3">
              <Avatar user={c.client} size={12} />
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.client.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{c.client.membership} plan</p>
              </div>
            </Link>
          ))}
          {clients.length === 0 && <p className="text-gray-500 col-span-full">No clients assigned yet.</p>}
        </div>
      )}
    </div>
  );
}
