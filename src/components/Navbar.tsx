import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Search, Sun, Moon, Menu, X, User,
  ChevronDown, LogOut, LayoutDashboard, Store, ShieldCheck,
  Trophy, MapPin, Calendar, Compass,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import clsx from 'clsx';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { to: '/discover',    label: 'Discover',    icon: <Compass className="w-4 h-4" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { to: '/nearby',      label: 'Nearby',       icon: <MapPin className="w-4 h-4" /> },
    { to: '/events',      label: 'Events',       icon: <Calendar className="w-4 h-4" /> },
    { to: '/add-restaurant', label: 'For Owners', icon: <Store className="w-4 h-4" /> },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const getRoleDashboardPath = () => {
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'owner') return '/owner';
    return '/dashboard';
  };

  const getRoleBadgeColor = () => {
    if (profile?.role === 'admin') return 'badge-red';
    if (profile?.role === 'owner') return 'badge-orange';
    return 'badge-gray';
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="page-container flex items-center h-16 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-misal flex items-center justify-center
                          group-hover:shadow-glow-orange transition-all duration-300">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-gradient hidden sm:block">
            TasteKolhapur
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 ml-4">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive(link.to)
                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search (desktop) */}
        <Link
          to="/discover"
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)]
                     text-sm text-[var(--text-muted)] bg-[var(--surface-secondary)] hover:border-orange-300
                     hover:text-[var(--text-primary)] transition-all duration-200 w-48"
        >
          <Search className="w-4 h-4" />
          <span>Search Kolhapur food…</span>
        </Link>

        {/* Dark mode toggle */}
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          className="btn-icon btn-ghost"
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* Auth / User menu */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              id="user-menu-btn"
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--surface-secondary)] transition-all duration-200"
            >
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-misal flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)] max-w-[100px] truncate">
                {profile?.display_name ?? 'Me'}
              </span>
              {profile?.role && profile.role !== 'customer' && (
                <span className={clsx('hidden sm:inline-flex', 'badge', getRoleBadgeColor(), 'text-[10px]')}>
                  {profile.role}
                </span>
              )}
              <ChevronDown className={clsx('w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 card shadow-xl animate-scale-in z-50">
                <div className="p-3 border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {profile?.display_name ?? user.email}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  <Link
                    to={getRoleDashboardPath()}
                    onClick={() => setUserMenuOpen(false)}
                    className="nav-item w-full"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {profile?.role === 'admin' ? 'Admin Panel' : profile?.role === 'owner' ? 'Owner Panel' : 'My Dashboard'}
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="nav-item w-full">
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  {(profile?.role === 'owner' || profile?.role === 'admin') && (
                    <Link to="/owner" onClick={() => setUserMenuOpen(false)} className="nav-item w-full">
                      <Store className="w-4 h-4" />
                      My Restaurant
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="nav-item w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/auth" className="btn btn-ghost btn-sm hidden sm:flex">Sign In</Link>
            <Link to="/auth?tab=signup" className="btn btn-primary btn-sm">Join Free</Link>
          </div>
        )}

        {/* Mobile menu button */}
        <button
          id="mobile-menu-btn"
          className="md:hidden btn-icon btn-ghost"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle mobile menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] animate-slide-up">
          <div className="p-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive(link.to)
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                )}
              >
                {link.icon} {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[var(--border)] mt-2">
              <Link
                to="/discover"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]"
              >
                <Search className="w-4 h-4" /> Search restaurants
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
