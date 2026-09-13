import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Avatar from '../../components/Avatar';

export default function Inbox() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/messages').then(setData).catch(() => setData({ convos: [], my_coach: null }));
  }, []);

  if (!data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-4xl">Messages</h1>

      {data.my_coach && !data.convos.some((c) => c.partner.id === data.my_coach.id) && (
        <Link to={`/messages/${data.my_coach.id}`} className="block bg-dark-800 border border-dark-600 rounded-2xl p-4 hover:border-brand">
          <div className="flex items-center gap-3">
            <Avatar user={data.my_coach} size={10} />
            <div>
              <p className="font-semibold">{data.my_coach.full_name}</p>
              <p className="text-xs text-gray-500">Your coach &middot; start a conversation</p>
            </div>
          </div>
        </Link>
      )}

      {data.convos.length === 0 && !data.my_coach && (
        <p className="text-gray-400 text-sm">No conversations yet.</p>
      )}

      <ul className="space-y-2">
        {data.convos.map((c) => (
          <li key={c.partner.id}>
            <Link to={`/messages/${c.partner.id}`} className="flex items-center gap-3 bg-dark-800 border border-dark-600 rounded-2xl p-4 hover:border-brand">
              <Avatar user={c.partner} size={10} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{c.partner.full_name}</p>
                {c.last && <p className="text-sm text-gray-500 truncate">{c.last.body}</p>}
              </div>
              {c.unread > 0 && (
                <span className="bg-brand text-dark text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">{c.unread}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
