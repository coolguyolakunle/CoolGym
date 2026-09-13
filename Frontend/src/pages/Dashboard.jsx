import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Avatar from '../components/Avatar';
import Notice from '../components/Notice';
import { optimizeProfileImage } from '../utils/profileImage';

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [logForm, setLogForm] = useState({ week: '', note: '', weight_kg: '', sessions: '', rating: 3 });
  const [busy, setBusy] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');

  const load = async () => {
    try {
      const d = await api.get('/api/dashboard');
      setData(d);
    } catch (e) {
      setNotice({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadPicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('image', await optimizeProfileImage(file));
      await api.postForm('/api/profile-picture', fd);
      await refresh();
      setNotice({ type: 'success', message: 'Profile picture updated.' });
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const cancelMembership = async () => {
    try {
      await api.post('/api/cancel-membership');
      await refresh();
      setNotice({ type: 'info', message: 'Membership cancelled.' });
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const savePhone = async () => {
    try { await api.post('/api/profile', { phone_number: phoneNumber }); await refresh(); setNotice({ type: 'success', message: 'Phone number updated.' }); }
    catch (err) { setNotice({ type: 'error', message: err.message }); }
  };

  const submitLog = async (e) => {
    e.preventDefault();
    if (!data?.active_plan) return;
    setBusy(true);
    try {
      await api.post('/api/my-plan/log', { ...logForm, plan_id: data.active_plan.id });
      setNotice({ type: 'success', message: 'Progress logged!' });
      setLogForm({ week: '', note: '', weight_kg: '', sessions: '', rating: 3 });
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  if (!data) {
    return (
      <Notice
        type="error"
        message={notice?.message || 'Unable to load your dashboard. Please try again.'}
        onDismiss={() => setNotice(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar user={user} size={20} />
          <label className="absolute -bottom-1 -right-1 bg-brand text-dark rounded-full h-7 w-7 flex items-center justify-center cursor-pointer text-xs">
            <i className="fa-solid fa-camera" />
            <input type="file" accept="image/*" onChange={uploadPicture} className="hidden" />
          </label>
        </div>
        <div>
          <h1 className="font-display text-4xl">{user?.full_name}</h1>
          <p className="text-gray-400 text-sm capitalize">{user?.membership === 'none' ? 'No active membership' : `${user?.membership} member`}</p>
        </div>
      </div>

      {notice && <Notice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
          <h2 className="font-display text-2xl mb-4">Membership</h2>
          {user?.membership === 'none' ? (
            <p className="text-gray-400 text-sm mb-4">You don't have an active plan yet.</p>
          ) : (
            <p className="text-gray-400 text-sm mb-4 capitalize">You're on the {user?.membership} plan.</p>
          )}
          <div className="flex gap-3">
            <Link to="/membership" className="bg-brand text-dark font-semibold px-4 py-2 rounded-xl text-sm">Manage plan</Link>
            {user?.membership !== 'none' && (
              <button onClick={cancelMembership} className="border border-dark-600 text-gray-300 font-semibold px-4 py-2 rounded-xl text-sm hover:border-red-500 hover:text-red-400">
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
          <h2 className="font-display text-2xl mb-4">Contact details</h2>
          <div className="flex gap-2"><input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number" className="min-w-0 flex-1 bg-dark border border-dark-600 rounded-xl px-3 py-2 text-sm" /><button onClick={savePhone} className="bg-brand text-dark font-semibold px-3 rounded-xl text-sm">Save</button></div>
        </div>

        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
          <h2 className="font-display text-2xl mb-4">My Coach</h2>
          {data.my_coach ? (
            <div className="flex items-center gap-3">
              <Avatar user={data.my_coach} size={12} />
              <div>
                <p className="font-semibold">{data.my_coach.full_name}</p>
                <p className="text-xs text-gray-500">{data.my_coach.specialty}</p>
                {data.my_coach.phone_number && <a href={`tel:${data.my_coach.phone_number}`} className="text-xs text-brand">{data.my_coach.phone_number}</a>}
              </div>
              <Link to={`/messages/${data.my_coach.id}`} className="ml-auto text-brand text-sm font-semibold">Message</Link>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No coach assigned yet. An admin will match you with one soon.</p>
          )}
        </div>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">Active Workout Plan</h2>
        {data.active_plan ? (
          <>
            <p className="font-semibold">{data.active_plan.title}</p>
            <p className="text-gray-400 text-sm mb-4">{data.active_plan.description} &middot; {data.active_plan.weeks} weeks</p>

            <form onSubmit={submitLog} className="grid md:grid-cols-5 gap-3 items-end">
              <input type="number" placeholder="Week" required value={logForm.week}
                onChange={(e) => setLogForm({ ...logForm, week: e.target.value })}
                className="bg-dark border border-dark-600 rounded-lg px-3 py-2 text-sm" />
              <input type="number" step="0.1" placeholder="Weight (kg)" value={logForm.weight_kg}
                onChange={(e) => setLogForm({ ...logForm, weight_kg: e.target.value })}
                className="bg-dark border border-dark-600 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Sessions" value={logForm.sessions}
                onChange={(e) => setLogForm({ ...logForm, sessions: e.target.value })}
                className="bg-dark border border-dark-600 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Note" value={logForm.note}
                onChange={(e) => setLogForm({ ...logForm, note: e.target.value })}
                className="bg-dark border border-dark-600 rounded-lg px-3 py-2 text-sm md:col-span-1" />
              <button disabled={busy} className="bg-brand text-dark font-semibold px-4 py-2 rounded-lg text-sm">
                {busy ? 'Saving...' : 'Log progress'}
              </button>
            </form>
          </>
        ) : (
          <p className="text-gray-400 text-sm">No active plan yet — your coach will set one up with you.</p>
        )}
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">Recent Progress</h2>
        {data.logs.length === 0 ? (
          <p className="text-gray-400 text-sm">No progress logged yet.</p>
        ) : (
          <ul className="divide-y divide-dark-600">
            {data.logs.map((l) => (
              <li key={l.id} className="py-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                <span className="font-semibold">Week {l.week}</span>
                {l.weight_kg && <span className="text-gray-400">{l.weight_kg} kg</span>}
                {l.sessions ? <span className="text-gray-400">{l.sessions} sessions</span> : null}
                {l.note && <span className="text-gray-500">{l.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
