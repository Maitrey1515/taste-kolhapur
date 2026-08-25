import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';

// Layouts & shared
import Navbar from '@/components/Navbar';
import ChatWindow from '@/components/ChatWindow';
import SupabaseBanner from '@/components/SupabaseBanner';
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
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import OwnerDashboard from '@/pages/OwnerDashboard';

// Admin pages
import AdminDashboard from '@/pages/AdminDashboard';

// ─── Route Guards ─────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/auth" replace />;
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
      {!isSupabaseConfigured && <SupabaseBanner />}
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

        {/* Owner claim (any authenticated user can start a claim) */}
        <Route path="/claim/:id" element={
          <RequireAuth><ClaimRestaurant /></RequireAuth>
        } />

        {/* Owner panel */}
        <Route path="/owner" element={
          <RequireRole role="owner"><OwnerDashboard /></RequireRole>
        } />

        {/* Admin panel */}
        <Route path="/admin" element={
          <RequireAdmin><AdminDashboard /></RequireAdmin>
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global floating chatbot */}
      <ChatWindow />
    </div>
  );
}
