import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Notice from '../components/Notice';

const PLANS = [
  { key: 'basic', name: 'Basic', price: '29.49', perks: ['Gym floor access', 'Locker room', 'Group classes'] },
  { key: 'elite', name: 'Elite', price: '149.99', perks: ['Everything in Basic', 'Assigned coach', 'Custom workout plans'] },
  { key: 'pro', name: 'Pro', price: '249.99', perks: ['Everything in Elite', 'Priority video coaching', 'Unlimited messaging'] },
];

export default function Membership() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);

  const enroll = async (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBusyPlan(plan);
    setNotice(null);
    try {
      const data = await api.post(`/api/book-membership/${plan}`);
      setNotice({ type: 'success', message: data.message });
    } catch (e) {
      setNotice({ type: 'error', message: e.message });
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <span className="text-brand text-sm font-semibold tracking-widest">MEMBERSHIP</span>
        <h1 className="font-display text-5xl mt-2 mb-4">Pick your plan.</h1>
      </section>

      {notice && <Notice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />}

      <section className="stagger grid md:grid-cols-3 gap-6">
        {PLANS.map((p) => {
          const isCurrent = user?.membership === p.key;
          return (
            <div key={p.key} className={`motion-card bg-dark-800 border rounded-2xl p-8 flex flex-col ${isCurrent ? 'border-brand' : 'border-dark-600'}`}>
              <h3 className="font-display text-3xl mb-1">{p.name}</h3>
              <p className="text-4xl font-bold mb-6">${p.price}<span className="text-sm text-gray-500 font-normal">/mo</span></p>
              <ul className="space-y-2 mb-8 flex-1">
                {p.perks.map((perk) => (
                  <li key={perk} className="text-sm text-gray-400 flex items-center gap-2">
                    <i className="fa-solid fa-check text-brand" /> {perk}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => enroll(p.key)}
                disabled={busyPlan === p.key || isCurrent}
                className={`font-bold px-6 py-3 rounded-xl transition-colors ${
                  isCurrent ? 'bg-dark-600 text-gray-400 cursor-default' : 'bg-brand text-dark hover:bg-brand-dark'
                }`}
              >
                {isCurrent ? 'Current Plan' : busyPlan === p.key ? 'Enrolling...' : user ? 'Enroll' : 'Login to enroll'}
              </button>
            </div>
          );
        })}
      </section>

      {!user && (
        <p className="text-center text-gray-500 text-sm">
          Don't have an account yet? <Link to="/register" className="text-brand">Join now</Link>.
        </p>
      )}
    </div>
  );
}
