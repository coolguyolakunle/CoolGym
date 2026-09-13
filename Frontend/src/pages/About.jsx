import { useEffect, useState } from 'react';

const STATS = [
  { value: 10000, suffix: 'K+', label: 'Members coached' },
  { value: 40000, suffix: 'K+', label: 'Certified coaches' },
  { value: 9, suffix: '', label: 'Years running' },
];

function useCountUp(target) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return undefined;
    }

    const duration = 1200;
    let startTime;
    let frame;
    const animate = (time) => {
      startTime ??= time;
      const progress = Math.min((time - startTime) / duration, 1);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function Stat({ value, suffix, label }) {
  const count = useCountUp(value);
  return (
    <div className="motion-card bg-dark-800 border border-dark-600 rounded-2xl p-8">
      <p className="font-display text-5xl text-brand">{suffix === 'K+' ? `${Math.round(count / 1000)}K+` : count}</p>
      <p className="text-gray-400 mt-2">{label}</p>
    </div>
  );
}

export default function About() {
  return (
    <div className="space-y-16">
      <section>
        <span className="text-brand text-sm font-semibold tracking-widest">ABOUT US</span>
        <h1 className="font-display text-5xl mt-2 mb-6">Built by people who train here too.</h1>
        <p className="text-gray-400 max-w-2xl">
          CoolGym started as a single strength studio and grew into a full coaching platform because
          the equipment was never the hard part. Staying consistent was. Every plan, coach, and class here
          exists to solve that problem.
        </p>
      </section>

      <section className="stagger grid md:grid-cols-2 gap-6">
        {['about1.jpg', 'about2.jpg', 'about3.jpg', 'about4.jpg'].map((img) => (
          <div key={img} className="motion-card overflow-hidden rounded-2xl"><img src={`/assets/img/${img}`} alt="CoolGym" className="media-lift w-full h-64 object-cover" /></div>
        ))}
      </section>

      <section className="stagger grid md:grid-cols-3 gap-6 text-center">
        {STATS.map((stat) => <Stat key={stat.label} {...stat} />)}
      </section>
    </div>
  );
}
