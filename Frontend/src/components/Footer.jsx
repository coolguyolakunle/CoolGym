import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-dark-600 mt-20 py-10 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <img src="/assets/img/CoolGym.png" alt="CoolGym" className="h-10 w-auto object-contain" />
        <p className="text-xs text-gray-500 text-center">&copy; {new Date().getFullYear()} CoolGym. All rights reserved.</p>
        <div className="flex gap-4 text-sm text-gray-400">
          <Link to="/about" className="hover:text-brand">About</Link>
          <Link to="/contact" className="hover:text-brand">Contact</Link>
          <Link to="/membership" className="hover:text-brand">Membership</Link>
        </div>
      </div>
    </footer>
  );
}
