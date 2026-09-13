import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUnreadMessages } from '../context/UnreadMessagesContext';

const linkClass = ({ isActive }) =>
  `nav-link hover:text-white transition-colors ${isActive ? 'text-white' : 'text-gray-300'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'coach' ? '/coach' : '/dashboard';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark/90 backdrop-blur border-b border-dark-600 py-4 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/assets/img/CoolGym.png" alt="CoolGym" className="h-12 md:h-14 w-auto object-contain" />
        </Link>

        <ul className="hidden md:flex items-center gap-8 text-sm font-medium">
          <li><NavLink to="/about" className={linkClass}>About</NavLink></li>
          <li><NavLink to="/membership" className={linkClass}>Membership</NavLink></li>
          <li><NavLink to="/classes" className={linkClass}>Classes</NavLink></li>
          <li><NavLink to="/services" className={linkClass}>Services</NavLink></li>
          <li><NavLink to="/contact" className={linkClass}>Contact</NavLink></li>
        </ul>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to={dashboardPath} className="text-sm font-semibold text-gray-200 hover:text-brand">
                {user.full_name}
              </Link>
              {user.role !== 'admin' && (
                <Link to="/messages" className="text-sm font-semibold text-gray-200 hover:text-brand">
                  Messages{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="border border-gray-700 text-gray-300 font-semibold px-4 py-2 rounded-xl text-sm hover:border-white hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-gray-200 hover:text-brand">Login</Link>
              <Link to="/register" className="bg-brand text-dark font-bold px-4 py-2 rounded-xl text-sm hover:bg-brand-dark transition-colors">
                Join Now
              </Link>
            </>
          )}
        </div>

        <button className="menu-toggle md:hidden text-2xl" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          <i className={open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} />
        </button>
      </div>

      <div className={`mobile-menu md:hidden ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="mt-4 flex flex-col gap-4 px-2 pb-2 text-sm">
          <NavLink to="/about" onClick={() => setOpen(false)} className={linkClass}>About</NavLink>
          <NavLink to="/membership" onClick={() => setOpen(false)} className={linkClass}>Membership</NavLink>
          <NavLink to="/classes" onClick={() => setOpen(false)} className={linkClass}>Classes</NavLink>
          <NavLink to="/services" onClick={() => setOpen(false)} className={linkClass}>Services</NavLink>
          <NavLink to="/contact" onClick={() => setOpen(false)} className={linkClass}>Contact</NavLink>
          <hr className="border-dark-600" />
          {user ? (
            <>
              <Link to={dashboardPath} onClick={() => setOpen(false)} className="font-semibold text-brand">{user.full_name}</Link>
              {user.role !== 'admin' && <Link to="/messages" onClick={() => setOpen(false)}>Messages{unreadCount > 0 ? ` (${unreadCount})` : ''}</Link>}
              <button onClick={handleLogout} className="text-left text-gray-300">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="text-brand font-bold">Join Now</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
