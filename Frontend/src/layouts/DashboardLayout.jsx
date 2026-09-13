import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { api } from '../api';
import { optimizeProfileImage } from '../utils/profileImage';
import { useUnreadMessages } from '../context/UnreadMessagesContext';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: 'fa-gauge', end: true },
  { to: '/admin/coaches', label: 'Coaches', icon: 'fa-user-tie' },
  { to: '/admin/assign', label: 'Assign Clients', icon: 'fa-link' },
  { to: '/admin/users', label: 'Members', icon: 'fa-users' },
  { to: '/admin/memberships', label: 'Memberships', icon: 'fa-id-card' },
  { to: '/admin/messages', label: 'Contact Messages', icon: 'fa-envelope' },
];

const COACH_LINKS = [
  { to: '/coach', label: 'Dashboard', icon: 'fa-gauge', end: true },
  { to: '/coach/clients', label: 'My Clients', icon: 'fa-users' },
  { to: '/messages', label: 'Messages', icon: 'fa-message' },
  { to: '/sessions', label: 'Video Sessions', icon: 'fa-video' },
];

export default function DashboardLayout({ section }) {
  const { user, logout, refresh } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const navigate = useNavigate();
  const links = section === 'admin' ? ADMIN_LINKS : COACH_LINKS;
  const title = section === 'admin' ? 'Admin' : 'Coach';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  const uploadPicture = async (e) => {
    const image = e.target.files?.[0];
    if (!image) return;
    try { const form = new FormData(); form.append('image', await optimizeProfileImage(image)); await api.postForm('/api/profile-picture', form); await refresh(); }
    catch { /* The member dashboard provides detailed upload feedback. */ }
  };

  return (
    <div className="min-h-screen flex w-full overflow-x-hidden bg-dark">
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-dark-600 bg-dark-800 p-5 gap-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/assets/img/CoolGym.png" alt="CoolGym" className="h-10 w-auto object-contain" />
          <span className="font-display text-lg tracking-wider text-brand">{title}</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-dark-700 text-brand border-l-2 border-brand' : 'text-gray-400 hover:bg-dark-700 hover:text-brand'
                }`
              }
            >
              <i className={`fa-solid ${l.icon} w-4`} />
              {l.label}
              {l.to === '/messages' && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-dark">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-dark-600">
          <label className="relative cursor-pointer"><Avatar user={user} size={10} /><span className="absolute -bottom-1 -right-1 bg-brand text-dark rounded-full h-4 w-4 flex items-center justify-center text-[8px]"><i className="fa-solid fa-camera" /></span><input type="file" accept="image/*" onChange={uploadPicture} className="hidden" /></label>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.full_name}</p>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-brand">Logout</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 w-0 md:w-auto">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-dark-600 bg-dark-800">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src="/assets/img/CoolGym.png" alt="CoolGym" className="h-9 w-auto" />
            <span className="font-display text-brand">{title}</span>
          </Link>
          <button onClick={handleLogout} className="shrink-0 text-xs text-gray-400 border border-dark-600 px-3 py-1.5 rounded-lg">Logout</button>
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto p-3 border-b border-dark-600 bg-dark-800">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium ${isActive ? 'bg-dark-700 text-brand' : 'text-gray-400'}`
              }
            >
              {l.label}
              {l.to === '/messages' && unreadCount > 0 && ` (${unreadCount})`}
            </NavLink>
          ))}
        </nav>
        <main className="w-full min-w-0 p-3 sm:p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
