import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Layouts & shared
import Navbar from '@/components/Navbar';
import ChatWindow from '@/components/ChatWindow';
import LoadingSpinner from '@/components/LoadingSpinner';

// Customer pages
import Home from '@/pages/Home';
import Discover from '@/pages/Discover';
import RestaurantDetail from '@/pages/RestaurantDetail';
import Leaderboard from '@/pages/Leaderboard';
import Nearby from '@/pages/Nearby';
import Events from '@/pages/Events';
import Auth from '@/pages/Auth';
import CustomerDashboard from '@/pages/CustomerDashboard';
import VerifyVisit from '@/pages/VerifyVisit';

// Owner pages
import AddRestaurant from '@/pages/AddRestaurant';
import OwnerDashboard from '@/pages/OwnerDashboard';

// Admin pages
import AdminDashboard from '@/pages/AdminDashboard';
import Seed from '@/pages/Seed';

// ─── Route Guards ─────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: 'owner' | 'admin'; children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!profile) return <Navigate to="/auth" replace />;
  if (profile.role !== role && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!profile) return <Navigate to="/auth" replace />;
  if (profile.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-[var(--surface)] transition-colors duration-300">
      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/"                        element={<Home />} />
        <Route path="/discover"                element={<Discover />} />
        <Route path="/restaurant/:slug"        element={<RestaurantDetail />} />
        <Route path="/leaderboard"             element={<Leaderboard />} />
        <Route path="/nearby"                  element={<Nearby />} />
        <Route path="/events"                  element={<Events />} />
        <Route path="/auth"                    element={<Auth />} />
        <Route path="/verify/:slug"            element={<VerifyVisit />} />

        {/* Customer (authenticated) */}
        <Route path="/dashboard" element={
          <RequireAuth><CustomerDashboard /></RequireAuth>
        } />

        {/* Owner registration (any authenticated user can register a restaurant) */}
        <Route path="/add-restaurant" element={
          <RequireAuth><AddRestaurant /></RequireAuth>
        } />

        {/* Owner panel */}
        <Route path="/owner" element={
          <RequireRole role="owner"><OwnerDashboard /></RequireRole>
        } />

        {/* Admin panel */}
        <Route path="/admin" element={
          <RequireAdmin><AdminDashboard /></RequireAdmin>
        } />

        {/* Temporary Seed route */}
        <Route path="/seed" element={<Seed />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global floating chatbot */}
      <ChatWindow />
    </div>
  );
}
