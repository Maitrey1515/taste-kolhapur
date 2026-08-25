import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UtensilsCrossed, ArrowRight, Loader2, Mail } from 'lucide-react';
import { showToast } from '@/components/Toast';
import clsx from 'clsx';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, user } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(searchParams.get('tab') as any || 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        // Navigation handled by effect
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        showToast({ type: 'success', title: 'Account created!', message: 'Welcome to TasteKolhapur.' });
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        showToast({ type: 'success', title: 'Reset email sent', message: 'Check your inbox for a password reset link.' });
        setMode('signin');
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Authentication failed', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--surface-secondary)] bg-[url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1600&q=20')] bg-cover bg-center bg-no-repeat bg-blend-overlay">
      <div className="max-w-md w-full space-y-8 card p-8 backdrop-blur-xl bg-[var(--surface)]/90 animate-scale-in border-orange-500/20 shadow-glow-orange">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-misal flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-display font-black text-[var(--text-primary)]">
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Join TasteKolhapur' : 'Reset Password'}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {mode === 'signin' ? 'Sign in to review and discover Misal' :
             mode === 'signup' ? 'Create an account to start reviewing' :
             'Enter your email to receive a reset link'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
                placeholder="Rahul Patil"
              />
            </div>
          )}
          
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="rahul@example.com"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                {mode === 'signin' && (
                  <button type="button" onClick={() => setMode('reset')} className="text-xs text-orange-500 hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'reset' ? <Mail className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {mode === 'signin' ? (
            <p>Don't have an account? <button onClick={() => setMode('signup')} className="text-orange-500 font-semibold hover:underline">Sign up</button></p>
          ) : mode === 'signup' ? (
            <p>Already have an account? <button onClick={() => setMode('signin')} className="text-orange-500 font-semibold hover:underline">Sign in</button></p>
          ) : (
            <p>Remember your password? <button onClick={() => setMode('signin')} className="text-orange-500 font-semibold hover:underline">Sign in</button></p>
          )}
        </div>
      </div>
    </main>
  );
}
