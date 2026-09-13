const CLASSES = [
  { title: 'Strength Foundations', img: 'about1.jpg', level: 'Beginner', desc: 'Learn the big compound lifts with close coaching supervision.' },
  { title: 'HIIT Conditioning', img: 'about2.jpg', level: 'All levels', desc: 'Short, intense intervals that build cardio capacity fast.' },
  { title: 'Powerlifting Club', img: 'about3.jpg', level: 'Intermediate+', desc: 'Squat, bench, and deadlift progressions for competitive lifters.' },
  { title: 'Mobility & Recovery', img: 'about4.jpg', level: 'All levels', desc: 'Stretching and mobility work to keep you training pain-free.' },
];

export default function Classes() {
  return (
    <div className="space-y-12">
      <section>
        <span className="text-brand text-sm font-semibold tracking-widest">CLASSES</span>
        <h1 className="font-display text-5xl mt-2 mb-4">Find your class.</h1>
      </section>
      <section className="stagger grid md:grid-cols-2 gap-6">
        {CLASSES.map((c) => (
          <div key={c.title} className="motion-card bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
            <img src={`/assets/img/${c.img}`} alt={c.title} className="media-lift w-full h-48 object-cover" />
            <div className="p-6">
              <span className="text-xs text-brand font-semibold uppercase tracking-widest">{c.level}</span>
              <h3 className="font-display text-2xl mt-1 mb-2">{c.title}</h3>
              <p className="text-gray-400 text-sm">{c.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
