import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="space-y-24">
      <section className="hero-motion relative rounded-3xl overflow-hidden border border-dark-600">
        <video autoPlay muted loop playsInline className="media-lift w-full h-[60vh] object-cover opacity-60">
          <source src="/assets/videos/gym1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 flex flex-col items-start justify-center px-8 md:px-16 bg-gradient-to-r from-dark/90 via-dark/50 to-transparent">
          <span className="text-brand font-semibold tracking-widest text-sm mb-3">COOLGYM</span>
          <h1 className="font-display text-5xl md:text-7xl leading-none mb-4">STRONGER<br />STARTS HERE</h1>
          <p className="text-gray-300 max-w-md mb-8">
            Elite coaching, purpose-built equipment, and a community that pushes you further than you'd go alone.
          </p>
          <div className="flex gap-4">
            <Link to="/membership" className="bg-brand text-dark font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors">
              View Membership
            </Link>
            <Link to="/classes" className="border border-gray-500 text-white font-bold px-6 py-3 rounded-xl hover:border-brand hover:text-brand transition-colors">
              See Classes
            </Link>
          </div>
        </div>
      </section>

      <section className="stagger grid md:grid-cols-3 gap-6">
        {[
          { icon: 'fa-dumbbell', title: 'Modern Equipment', text: 'Top-tier strength and cardio equipment, maintained daily.' },
          { icon: 'fa-user-tie', title: 'Expert Coaches', text: 'Certified coaches build a plan around your goals, not a template.' },
          { icon: 'fa-video', title: 'Remote Coaching', text: 'Message your coach and jump on a video call whenever you need to.' },
        ].map((f) => (
          <div key={f.title} className="motion-card bg-dark-800 border border-dark-600 rounded-2xl p-8">
            <i className={`fa-solid ${f.icon} text-brand text-3xl mb-4`} />
            <h3 className="font-display text-2xl mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="motion-card text-center bg-dark-800 border border-dark-600 rounded-3xl p-12">
        <h2 className="font-display text-4xl mb-4">Ready to get stronger?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join CoolGym today and get matched with a coach who keeps you accountable.</p>
        <Link to="/register" className="bg-brand text-dark font-bold px-8 py-3 rounded-xl hover:bg-brand-dark transition-colors inline-block">
          Join Now
        </Link>
      </section>
    </div>
  );
}
