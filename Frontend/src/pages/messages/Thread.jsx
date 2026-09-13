import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import Avatar from '../../components/Avatar';
import { useUnreadMessages } from '../../context/UnreadMessagesContext';

export default function Thread() {
  const { partnerId } = useParams();
  const [data, setData] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const { refreshUnreadCount } = useUnreadMessages();

  const load = async () => {
    const d = await api.get(`/api/messages/${partnerId}`);
    setData(d);
    refreshUnreadCount();
  };

  useEffect(() => {
    setData(null);
    load();
  }, [partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.thread?.length]);

  // Lightweight polling for new messages, mirroring the original app's poll endpoint.
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      if (!data?.thread) return;
      const since = data.thread.length ? data.thread[data.thread.length - 1].sent_at : new Date(0).toISOString();
      try {
        const newMsgs = await api.get(`/api/messages/poll/${partnerId}?since=${encodeURIComponent(since)}`);
        if (newMsgs.length) {
          setData((prev) => ({ ...prev, thread: [...prev.thread, ...newMsgs] }));
          refreshUnreadCount();
        }
      } catch {
        // ignore transient poll failures
      }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [partnerId, data?.thread]);

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await api.post(`/api/messages/${partnerId}`, { body: text });
      setData((prev) => ({ ...prev, thread: [...prev.thread, res.message_obj] }));
      setBody('');
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[70vh]">
      <div className="flex items-center gap-3 pb-4 border-b border-dark-600">
        <Link to="/messages" className="text-gray-400 hover:text-white"><i className="fa-solid fa-arrow-left" /></Link>
        <Avatar user={data.partner} size={10} />
        <div>
          <p className="font-semibold">{data.partner.full_name}</p>
          <p className="text-xs text-gray-500 capitalize">{data.partner.role}</p>
        </div>
        <Link to={`/calls/${data.partner.id}`} className="ml-auto border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
          <i className="fa-solid fa-video mr-1" /> Call
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-2">
        {data.thread.map((m) => (
          <div key={m.id} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.is_mine ? 'bg-brand text-dark' : 'bg-dark-800 border border-dark-600'}`}>
              {m.body}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-dark-600">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message..."
          className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <button disabled={busy} className="bg-brand text-dark font-bold px-5 rounded-xl">Send</button>
      </form>
    </div>
  );
}
