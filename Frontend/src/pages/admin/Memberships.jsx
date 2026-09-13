import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';

export default function AdminMemberships() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const status = params.get('status') || '';
  const plan = params.get('plan') || '';
  const page = params.get('page') || '1';

  const load = async () => {
    const qs = new URLSearchParams({ status, plan, page }).toString();
    setData(await api.get(`/api/admin/memberships?${qs}`));
  };

  useEffect(() => { load(); }, [status, plan, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  const updateStatus = async (id, newStatus) => {
    await api.post(`/api/admin/memberships/${id}/update`, { status: newStatus });
    await load();
  };

  if (!data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Memberships</h1>

      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => updateParam('status', e.target.value)} className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={plan} onChange={(e) => updateParam('plan', e.target.value)} className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-2 text-sm">
          <option value="">All plans</option>
          <option value="basic">Basic</option>
          <option value="elite">Elite</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
            <tr><th className="p-4">Member</th><th className="p-4">Plan</th><th className="p-4">Status</th><th className="p-4">Booked</th><th className="p-4"></th></tr>
          </thead>
          <tbody className="divide-y divide-dark-600">
            {data.bookings.map((b) => (
              <tr key={b.id}>
                <td className="p-4">{b.user?.full_name}</td>
                <td className="p-4 capitalize">{b.plan}</td>
                <td className="p-4 capitalize">{b.status}</td>
                <td className="p-4 text-gray-500">{b.booked_at ? new Date(b.booked_at).toLocaleDateString() : ''}</td>
                <td className="p-4">
                  <select value={b.status} onChange={(e) => updateStatus(b.id, e.target.value)} className="bg-dark border border-dark-600 rounded-lg px-2 py-1 text-xs">
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {data.bookings.length === 0 && <tr><td colSpan={5} className="p-6 text-gray-500">No bookings found.</td></tr>}
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
    </div>
  );
}
