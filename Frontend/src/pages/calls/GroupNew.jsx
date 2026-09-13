import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import Notice from '../../components/Notice';

export default function GroupNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/api/sessions/start', { call_type: 'group', title });
      navigate(`/sessions/${res.room_id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="font-display text-4xl">Start Group Session</h1>
      {error && <Notice type="error" message={error} onDismiss={() => setError(null)} />}
      <form onSubmit={submit} className="space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-6">
        <input placeholder="Session title (optional)" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3" />
        <button disabled={busy} className="w-full bg-brand text-dark font-bold px-6 py-3 rounded-xl">
          {busy ? 'Starting...' : 'Start Session'}
        </button>
      </form>
    </div>
  );
}
