import { Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from './components/RouteGuards';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Classes from './pages/Classes';
import Membership from './pages/Membership';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

import Inbox from './pages/messages/Inbox';
import Thread from './pages/messages/Thread';

import AdminDashboard from './pages/admin/Dashboard';
import AdminCoaches from './pages/admin/Coaches';
import AdminAddCoach from './pages/admin/AddCoach';
import AdminCoachDetail from './pages/admin/CoachDetail';
import AdminAssign from './pages/admin/Assign';
import AdminUsers from './pages/admin/Users';
import AdminUserDetail from './pages/admin/UserDetail';
import AdminAddUser from './pages/admin/AddUser';
import AdminMemberships from './pages/admin/Memberships';
import AdminMessages from './pages/admin/Messages';

import CoachDashboard from './pages/coach/Dashboard';
import CoachClients from './pages/coach/Clients';
import CoachClientDetail from './pages/coach/ClientDetail';

import Sessions from './pages/calls/Sessions';
import GroupNew from './pages/calls/GroupNew';
import Room from './pages/calls/Room';

export default function App() {
  return (
    <Routes>
      {/* Public marketing pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Member area (still uses the public nav, like the original app) */}
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/messages" element={<RequireAuth><Inbox /></RequireAuth>} />
        <Route path="/messages/:partnerId" element={<RequireAuth><Thread /></RequireAuth>} />
        <Route path="/sessions" element={<RequireAuth><Sessions /></RequireAuth>} />
        <Route path="/sessions/new" element={<RequireRole roles={['coach', 'admin']}><GroupNew /></RequireRole>} />
      </Route>

      {/* Full-screen call room (no nav/footer chrome) */}
      <Route path="/sessions/:roomId" element={<RequireAuth><Room /></RequireAuth>} />
      <Route path="/calls/:partnerId" element={<RequireAuth><Room direct /></RequireAuth>} />

      {/* Admin */}
      <Route element={<RequireRole roles={['admin']}><DashboardLayout section="admin" /></RequireRole>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/coaches" element={<AdminCoaches />} />
        <Route path="/admin/coaches/add" element={<AdminAddCoach />} />
        <Route path="/admin/coaches/:coachId" element={<AdminCoachDetail />} />
        <Route path="/admin/assign" element={<AdminAssign />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/add" element={<AdminAddUser />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
        <Route path="/admin/memberships" element={<AdminMemberships />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
      </Route>

      {/* Coach */}
      <Route element={<RequireRole roles={['coach', 'admin']}><DashboardLayout section="coach" /></RequireRole>}>
        <Route path="/coach" element={<CoachDashboard />} />
        <Route path="/coach/clients" element={<CoachClients />} />
        <Route path="/coach/clients/:clientId" element={<CoachClientDetail />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
