import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';

export default function Sessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null);

  useEffect(() => { api.get('/api/sessions').then((d) => setSessions(d.sessions)); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Video Sessions</h1>
        {(user?.role === 'coach' || user?.role === 'admin') && (
          <Link to="/sessions/new" className="bg-brand text-dark font-bold px-4 py-2 rounded-xl text-sm">+ Start Group Session</Link>
        )}
      </div>

      {!sessions ? <p className="text-gray-500">Loading...</p> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sessions.map((s) => (
            <Link key={s.room_id} to={`/sessions/${s.room_id}`} className="bg-dark-800 border border-dark-600 rounded-2xl p-5 hover:border-brand">
              <div className="flex items-center gap-3 mb-2">
                <Avatar user={s.host} size={9} />
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-gray-500">Hosted by {s.host?.full_name}</p>
                </div>
              </div>
              <span className="text-xs text-brand font-semibold uppercase">{s.status}</span>
            </Link>
          ))}
          {sessions.length === 0 && <p className="text-gray-500 col-span-full">No active sessions right now.</p>}
        </div>
      )}
    </div>
  );
}
