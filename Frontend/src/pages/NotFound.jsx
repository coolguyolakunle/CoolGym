import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <h1 className="font-display text-7xl text-brand">404</h1>
      <p className="text-gray-400">That page doesn't exist.</p>
      <Link to="/" className="bg-brand text-dark font-bold px-6 py-3 rounded-xl">Back home</Link>
    </div>
  );
}
