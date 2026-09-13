import { useState } from 'react';
import { api } from '../api';
import Notice from '../components/Notice';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const data = await api.post('/api/contact', form);
      setNotice({ type: 'success', message: data.message });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (e) {
      setNotice({ type: 'error', message: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <section>
        <span className="text-brand text-sm font-semibold tracking-widest">CONTACT</span>
        <h1 className="font-display text-5xl mt-2 mb-4">Get in touch.</h1>
      </section>

      {notice && <Notice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />}

      <form onSubmit={onSubmit} className="motion-card space-y-4 bg-dark-800 border border-dark-600 rounded-2xl p-8">
        <input name="name" value={form.name} onChange={onChange} required placeholder="Your name"
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <input name="email" type="email" value={form.email} onChange={onChange} required placeholder="Your email"
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <input name="subject" value={form.subject} onChange={onChange} placeholder="Subject (optional)"
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <textarea name="message" value={form.message} onChange={onChange} required rows={5} placeholder="Message"
          className="w-full bg-dark border border-dark-600 rounded-xl px-4 py-3 focus:border-brand outline-none" />
        <button disabled={busy} className="w-full bg-brand text-dark font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60">
          {busy ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
