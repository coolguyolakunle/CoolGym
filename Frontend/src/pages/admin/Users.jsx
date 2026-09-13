import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';

export default function AdminUsers() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const search = params.get('search') || '';
  const membership = params.get('membership') || '';
  const page = params.get('page') || '1';

  useEffect(() => {
    const qs = new URLSearchParams({ search, membership, page }).toString();
    api.get(`/api/admin/users?${qs}`).then(setData);
  }, [search, membership, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Members</h1>
        <Link to="/admin/users/add" className="bg-brand text-dark font-bold px-4 py-2 rounded-xl text-sm">+ Add Member</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input placeholder="Search name or email..." defaultValue={search}
          onKeyDown={(e) => e.key === 'Enter' && updateParam('search', e.target.value)}
          onBlur={(e) => updateParam('search', e.target.value)}
          className="w-full sm:flex-1 sm:min-w-[200px] bg-dark-800 border border-dark-600 rounded-xl px-4 py-2 text-sm" />
        <select value={membership} onChange={(e) => updateParam('membership', e.target.value)} className="w-full sm:w-auto bg-dark-800 border border-dark-600 rounded-xl px-4 py-2 text-sm">
          <option value="">All plans</option>
          <option value="none">None</option>
          <option value="basic">Basic</option>
          <option value="elite">Elite</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {!data ? <p className="text-gray-500">Loading...</p> : (
        <>
          <div className="bg-dark-800 border border-dark-600 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Membership</th><th className="p-4">Joined</th></tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-dark-700">
                    <td className="p-4"><Link to={`/admin/users/${u.id}`} className="hover:text-brand font-medium">{u.full_name}</Link></td>
                    <td className="p-4 text-gray-400">{u.email}</td>
                    <td className="p-4 capitalize">{u.membership}</td>
                    <td className="p-4 text-gray-500">{u.joined_at ? new Date(u.joined_at).toLocaleDateString() : ''}</td>
                  </tr>
                ))}
                {data.users.length === 0 && <tr><td colSpan={4} className="p-6 text-gray-500">No members found.</td></tr>}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex gap-2 justify-center text-sm">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => updateParam('page', String(p))}
                  className={`h-8 w-8 rounded-lg ${String(p) === page ? 'bg-brand text-dark' : 'bg-dark-800 border border-dark-600'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
