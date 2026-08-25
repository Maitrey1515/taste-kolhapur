import { AlertTriangle, ExternalLink } from 'lucide-react';

export default function SupabaseBanner() {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
      <div className="page-container flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Supabase not configured.</strong> Add{' '}
          <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-[10px]">VITE_SUPABASE_URL</code> and{' '}
          <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-[10px]">VITE_SUPABASE_ANON_KEY</code>{' '}
          to your <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-[10px]">.env</code> file.
          The app is running in demo mode with seed data.
        </p>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap"
        >
          Supabase Dashboard <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
