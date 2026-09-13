import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api';

const STAT_CARDS = [
  { key: 'total_users', label: 'Members', icon: 'fa-users' },
  { key: 'total_coaches', label: 'Coaches', icon: 'fa-user-tie' },
  { key: 'active_members', label: 'Active Members', icon: 'fa-bolt' },
  { key: 'total_assignments', label: 'Assignments', icon: 'fa-link' },
];

function BarChart({ title, values, labels, formatter = (value) => value, color = 'bg-brand' }) {
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <section className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="text-sm text-brand font-semibold">{formatter(total)}</span>
      </div>
      <div className="h-44 flex items-end gap-2 border-b border-dark-600 pb-1" aria-label={`${title} for the last six months`}>
        {values.map((value, index) => (
          <div key={labels[index]} className="h-full flex-1 min-w-0 flex flex-col justify-end items-center gap-2 group">
            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{formatter(value)}</span>
            <div
              className={`${color} w-full max-w-10 rounded-t-md transition-all duration-500 min-h-[3px]`}
              style={{ height: `${Math.max((value / max) * 100, value ? 4 : 1)}%` }}
              title={`${labels[index]}: ${formatter(value)}`}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2 mt-2 text-center text-xs text-gray-500">
        {labels.map((label) => <span key={label}>{label}</span>)}
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const [d, setD] = useState(null);

  useEffect(() => { api.get('/api/admin/dashboard').then(setD); }, []);

  if (!d) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Admin Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((s) => (
          <div key={s.key} className="stat-card bg-dark-800 border border-dark-600 rounded-2xl p-5">
            <i className={`fa-solid ${s.icon} text-brand mb-2`} />
            <p className="text-3xl font-display">{d[s.key]}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
        <div className="stat-card bg-dark-800 border border-dark-600 rounded-2xl p-5">
          <i className="fa-solid fa-sack-dollar text-brand mb-2" />
          <p className="text-3xl font-display">${d.revenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Monthly revenue (est.)</p>
        </div>
        <div className="stat-card bg-dark-800 border border-dark-600 rounded-2xl p-5">
          <i className="fa-solid fa-user-plus text-brand mb-2" />
          <p className="text-3xl font-display">{d.new_this_week}</p>
          <p className="text-xs text-gray-500">New this week</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <BarChart title="Income made" values={d.charts.revenue} labels={d.charts.labels} formatter={(value) => `$${value.toFixed(2)}`} />
        <BarChart title="New clients" values={d.charts.clients} labels={d.charts.labels} color="bg-sky-400" />
        <BarChart title="Subscriptions" values={d.charts.subscriptions} labels={d.charts.labels} color="bg-violet-400" />
        <BarChart title="Progress logs" values={d.charts.progress} labels={d.charts.labels} color="bg-emerald-400" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Recent Members</h2>
          <ul className="space-y-2 text-sm">
            {d.recent_users.map((u) => (
              <li key={u.id}><Link to={`/admin/users/${u.id}`} className="hover:text-brand">{u.full_name}</Link></li>
            ))}
            {d.recent_users.length === 0 && <li className="text-gray-500">None yet</li>}
          </ul>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Recent Contact Messages</h2>
          <ul className="space-y-2 text-sm">
            {d.recent_messages.map((m) => (
              <li key={m.id} className="truncate">{m.name}: <span className="text-gray-500">{m.message}</span></li>
            ))}
            {d.recent_messages.length === 0 && <li className="text-gray-500">None yet</li>}
          </ul>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Recent Bookings</h2>
          <ul className="space-y-2 text-sm">
            {d.recent_bookings.map((b) => (
              <li key={b.id} className="capitalize">{b.user?.full_name} — {b.plan} ({b.status})</li>
            ))}
            {d.recent_bookings.length === 0 && <li className="text-gray-500">None yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
