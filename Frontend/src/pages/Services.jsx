const SERVICES = [
  { icon: 'fa-dumbbell', title: 'Personal Training', text: '1-on-1 sessions tailored to your goals, in-person or over video call.' },
  { icon: 'fa-people-group', title: 'Group Classes', text: 'High-energy group sessions across strength, HIIT, and mobility.' },
  { icon: 'fa-clipboard-list', title: 'Custom Programming', text: 'Multi-week workout plans built and adjusted by your coach.' },
  { icon: 'fa-chart-line', title: 'Progress Tracking', text: 'Log workouts and weight, and see your trend over time.' },
  { icon: 'fa-comments', title: 'Direct Coach Messaging', text: 'Ask questions and get feedback between sessions.' },
  { icon: 'fa-video', title: 'Video Coaching', text: 'Live 1-on-1 or group video calls, right from your dashboard.' },
];

export default function Services() {
  return (
    <div className="space-y-12">
      <section>
        <span className="text-brand text-sm font-semibold tracking-widest">SERVICES</span>
        <h1 className="font-display text-5xl mt-2 mb-4">Everything you need to keep progressing.</h1>
      </section>
      <section className="stagger grid md:grid-cols-3 gap-6">
        {SERVICES.map((s) => (
          <div key={s.title} className="motion-card bg-dark-800 border border-dark-600 rounded-2xl p-8">
            <i className={`fa-solid ${s.icon} text-brand text-2xl mb-4`} />
            <h3 className="font-display text-2xl mb-2">{s.title}</h3>
            <p className="text-gray-400 text-sm">{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
