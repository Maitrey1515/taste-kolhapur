import { AuthState, subscribeToAuth, signOut } from './auth.js';

export function initNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  function render() {
    const isAuth = !!AuthState.user;
    const profile = AuthState.profile;

    container.innerHTML = `
      <nav class="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md transition-colors duration-300">
        <div class="page-container flex items-center h-16 gap-4">
          <!-- Logo -->
          <a href="/index.html" class="flex items-center gap-2 flex-shrink-0 group">
            <div class="w-8 h-8 rounded-xl bg-gradient-misal flex items-center justify-center group-hover:shadow-glow-orange transition-all duration-300">
              <i data-lucide="utensils-crossed" class="w-4 h-4 text-white"></i>
            </div>
            <span class="font-display font-bold text-lg text-gradient-misal hidden sm:block">
              TasteKolhapur
            </span>
          </a>

          <!-- Desktop Nav Links -->
          <div class="hidden md:flex items-center gap-1 ml-4">
            <a href="/discover.html" class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all">
              <i data-lucide="compass" class="w-4 h-4"></i> Discover
            </a>
            <a href="/leaderboard.html" class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all">
              <i data-lucide="trophy" class="w-4 h-4"></i> Leaderboard
            </a>
            <a href="/events.html" class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all">
              <i data-lucide="calendar" class="w-4 h-4"></i> Events
            </a>
          </div>

          <div class="flex-1"></div>

          <!-- Auth Actions -->
          <div id="auth-actions" class="flex items-center gap-2">
            ${isAuth ? `
              <div class="relative">
                <button id="user-menu-btn" class="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-all">
                  <div class="w-7 h-7 rounded-full bg-gradient-misal flex items-center justify-center text-white text-xs">
                    ${profile?.display_name?.charAt(0) || 'U'}
                  </div>
                  <span class="hidden sm:block text-sm font-medium max-w-[100px] truncate">${profile?.display_name || 'Me'}</span>
                </button>
                <div id="user-menu" class="hidden absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2">
                   <div class="p-2 border-b mb-2">
                     <p class="text-sm font-bold truncate">${profile?.display_name || 'User'}</p>
                   </div>
                   <a href="/dashboard.html" class="block px-3 py-2 text-sm hover:bg-gray-50 rounded-lg">Dashboard</a>
                   <button id="logout-btn" class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">Sign Out</button>
                </div>
              </div>
            ` : `
              <a href="/login.html" class="btn btn-ghost btn-sm hidden sm:flex text-sm font-medium">Sign In</a>
              <a href="/signup.html" class="px-4 py-2 bg-gradient-misal text-white rounded-lg text-sm font-medium hover:opacity-90">Join Free</a>
            `}
            
            <!-- Mobile Menu Toggle -->
            <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <i data-lucide="menu" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
        
        <!-- Mobile Nav Links -->
        <div id="mobile-menu" class="hidden md:hidden border-t border-gray-100 bg-white p-4 space-y-2">
          <a href="/discover.html" class="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Discover</a>
          <a href="/leaderboard.html" class="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Leaderboard</a>
          <a href="/events.html" class="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Events</a>
          ${!isAuth ? `<a href="/login.html" class="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Sign In</a>` : ''}
        </div>
      </nav>
    `;

    // Re-initialize lucide icons for dynamically added HTML
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Attach event listeners
    if (isAuth) {
      document.getElementById('user-menu-btn')?.addEventListener('click', () => {
        document.getElementById('user-menu')?.classList.toggle('hidden');
      });
      document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut().then(() => window.location.reload());
      });
    }
    
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('mobile-menu')?.classList.toggle('hidden');
    });
  }

  // Subscribe to auth state changes to re-render navbar
  subscribeToAuth(render);
}
