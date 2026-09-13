import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Avatar from '../../components/Avatar';

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState(null);

  useEffect(() => { api.get('/api/admin/coaches').then((d) => setCoaches(d.coaches)); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Coaches</h1>
        <Link to="/admin/coaches/add" className="bg-brand text-dark font-bold px-4 py-2 rounded-xl text-sm">+ Add Coach</Link>
      </div>

      {!coaches ? <p className="text-gray-500">Loading...</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((c) => (
            <Link key={c.id} to={`/admin/coaches/${c.id}`} className="bg-dark-800 border border-dark-600 rounded-2xl p-5 hover:border-brand flex items-center gap-3">
              <Avatar user={c} size={12} />
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{c.specialty || 'General coaching'}</p>
                <span className={`text-xs ${c.is_active ? 'text-green-400' : 'text-gray-500'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </Link>
          ))}
          {coaches.length === 0 && <p className="text-gray-500 col-span-full">No coaches yet.</p>}
        </div>
      )}
    </div>
  );
}
