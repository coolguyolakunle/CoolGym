import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import Notice from '../../components/Notice';

export default function AdminMessages() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const page = params.get('page') || '1';

  const load = async () => setData(await api.get(`/api/admin/messages?page=${page}`));
  useEffect(() => { load(); }, [page]);

  const remove = async (id) => {
    if (!confirm('Delete this message?')) return;
    await api.post(`/api/admin/messages/${id}/delete`);
    await load();
  };

  const sendReply = async (id) => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    setNotice(null);
    try {
      const result = await api.post(`/api/admin/messages/${id}/reply`, { body });
      setNotice({ type: 'success', message: result.message });
      setReplyingTo(null);
      setReply('');
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setSending(false);
    }
  };

  if (!data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Contact Messages</h1>
      {notice && <Notice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />}

      <div className="space-y-3">
        {data.messages.map((m) => (
          <div key={m.id} className="bg-dark-800 border border-dark-600 rounded-2xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{m.name} <span className="text-gray-500 font-normal text-sm">&lt;{m.email}&gt;</span></p>
                {m.subject && <p className="text-sm text-brand">{m.subject}</p>}
              </div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => { setReplyingTo(replyingTo === m.id ? null : m.id); setReply(''); }} className="text-brand hover:underline">Reply</button>
                <button onClick={() => remove(m.id)} className="text-red-400 hover:underline">Delete</button>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-2">{m.message}</p>
            <p className="text-xs text-gray-600 mt-2">{m.sent_at ? new Date(m.sent_at).toLocaleString() : ''}</p>
            {replyingTo === m.id && (
              <div className="mt-4 border-t border-dark-600 pt-4 space-y-2">
                <label className="text-xs text-gray-400">Reply directly to {m.email}</label>
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder="Write your reply..."
                  className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" />
                <div className="flex gap-2">
                  <button disabled={sending || !reply.trim()} onClick={() => sendReply(m.id)} className="bg-brand text-dark font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                    {sending ? 'Sending...' : 'Send email reply'}
                  </button>
                  <button onClick={() => { setReplyingTo(null); setReply(''); }} className="text-sm text-gray-400 hover:text-white">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {data.messages.length === 0 && <p className="text-gray-500">No messages yet.</p>}
      </div>

      {data.pages > 1 && (
        <div className="flex gap-2 justify-center text-sm">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setParams({ page: String(p) })}
              className={`h-8 w-8 rounded-lg ${String(p) === page ? 'bg-brand text-dark' : 'bg-dark-800 border border-dark-600'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
