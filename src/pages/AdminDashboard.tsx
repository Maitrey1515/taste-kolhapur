import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BarChart3, Users, Settings, Database, Server, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { showToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'platform'|'claims'|'mps'>('platform');
  const [loading, setLoading] = useState(true);
  
  // Platform Stats
  const [stats, setStats] = useState({ users: 0, restaurants: 0, reviews: 0 });
  const [claims, setClaims] = useState<any[]>([]);
  
  // MPS Weights config
  const [mpsWeights, setMpsWeights] = useState({
    w_R: 0.3, w_CS: 0.3, w_V: 0.2, w_Rec: 0.1, w_RP: 0.1
  });
  
  const [confirmAction, setConfirmAction] = useState<{type: 'approve'|'reject', id: string, rest_id: string, user_id: string} | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // 1. Fetch claims
      const { data: claimsData } = await supabase
        .from('claims')
        .select('*, restaurant:restaurants(name), user:profiles(display_name, email)')
        .eq('status', 'pending');
        
      if (claimsData) setClaims(claimsData);
      
      // 2. Fetch mock counts (in a real app, use COUNT queries)
      setStats({
        users: 154,
        restaurants: 13,
        reviews: 432
      });
      
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleClaimAction = async () => {
    if (!confirmAction) return;
    const { type, id, rest_id, user_id } = confirmAction;
    
    if (type === 'approve') {
      // 1. Update claim status
      await supabase.from('claims').update({ status: 'approved' }).eq('id', id);
      // 2. Update restaurant owner & claimed flag
      await supabase.from('restaurants').update({ owner_id: user_id, claimed: true }).eq('id', rest_id);
      // 3. Update user role
      await supabase.from('profiles').update({ role: 'owner' }).eq('id', user_id);
      
      showToast({ type: 'success', title: 'Claim Approved', message: 'User is now the owner.' });
    } else {
      // Reject
      await supabase.from('claims').update({ status: 'rejected' }).eq('id', id);
      showToast({ type: 'info', title: 'Claim Rejected' });
    }
    
    setClaims(claims.filter(c => c.id !== id));
    setConfirmAction(null);
  };

  const handleSaveWeights = () => {
    const total = Object.values(mpsWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1.0) > 0.01) {
      showToast({ type: 'error', title: 'Invalid Weights', message: 'Sum of weights must equal 1.0' });
      return;
    }
    
    // In a real app, save to a configuration table. For now, show toast.
    showToast({ type: 'success', title: 'MPS Config Updated', message: 'Global ranking weights saved.' });
  };

  const MOCK_HISTOGRAM = [
    { range: '1.0-2.0', count: 1 },
    { range: '2.0-3.0', count: 3 },
    { range: '3.0-4.0', count: 5 },
    { range: '4.0-5.0', count: 4 },
  ];

  if (profile?.role !== 'admin') {
    return (
      <div className="py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-[var(--text-muted)]">You must be an administrator to view this page.</p>
      </div>
    );
  }

  return (
    <main className="page-container py-8 flex flex-col md:flex-row gap-6">
      
      <aside className="w-full md:w-64 flex-shrink-0 space-y-2">
        <div className="card p-4 mb-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Role</p>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)] leading-tight">Super Admin</h2>
        </div>
        
        {[
          { id: 'platform', label: 'Platform Stats', icon: BarChart3 },
          { id: 'claims',   label: `Claims Queue (${claims.length})`, icon: Users },
          { id: 'mps',      label: 'MPS Configuration', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
              activeTab === tab.id ? 'bg-red-500 text-white shadow-md' : 'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        {loading ? <LoadingSpinner /> : (
          <>
            {/* TAB: Platform Stats */}
            {activeTab === 'platform' && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-4">Platform Overview</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="card p-5 border-t-4 border-t-blue-500">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Users className="w-4 h-4"/> Total Users</p>
                    <p className="text-3xl font-display font-bold text-[var(--text-primary)] mt-2">{stats.users}</p>
                  </div>
                  <div className="card p-5 border-t-4 border-t-orange-500">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Database className="w-4 h-4"/> Restaurants</p>
                    <p className="text-3xl font-display font-bold text-[var(--text-primary)] mt-2">{stats.restaurants}</p>
                  </div>
                  <div className="card p-5 border-t-4 border-t-purple-500">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Reviews</p>
                    <p className="text-3xl font-display font-bold text-[var(--text-primary)] mt-2">{stats.reviews}</p>
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="font-semibold mb-4">MPS Score Distribution</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={MOCK_HISTOGRAM}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={12} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} />
                        <RechartsTooltip cursor={{fill: 'var(--surface-secondary)'}} contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                        <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Claims */}
            {activeTab === 'claims' && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-4">Ownership Claims Queue</h2>
                
                {claims.length === 0 ? (
                  <div className="card py-12 text-center text-[var(--text-muted)]">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                    All caught up! No pending claims.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {claims.map(claim => (
                      <div key={claim.id} className="card p-5">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div>
                            <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                              {claim.restaurant?.name}
                            </h3>
                            <div className="text-sm text-[var(--text-secondary)] mt-1 space-y-1">
                              <p><strong>Claimant:</strong> {claim.full_name} ({claim.user?.email})</p>
                              <p><strong>Role:</strong> {claim.business_role}</p>
                              <p><strong>Phone:</strong> {claim.phone}</p>
                              <p><strong>Submitted:</strong> {new Date(claim.created_at).toLocaleString()}</p>
                            </div>
                            <div className="mt-3">
                              <button className="text-sm text-blue-500 hover:underline">View Attached Proof Document</button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmAction({type: 'reject', id: claim.id, rest_id: claim.restaurant_id, user_id: claim.user_id})} className="btn btn-secondary">
                              Reject
                            </button>
                            <button onClick={() => setConfirmAction({type: 'approve', id: claim.id, rest_id: claim.restaurant_id, user_id: claim.user_id})} className="btn bg-green-500 hover:bg-green-600 text-white border-transparent">
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MPS */}
            {activeTab === 'mps' && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-4">MPS Algorithm Configuration</h2>
                
                <div className="card p-6 border border-orange-500/30">
                  <div className="flex items-start gap-3 mb-6 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-700 dark:text-orange-300">Danger Zone</h4>
                      <p className="text-sm text-orange-600/80 dark:text-orange-400/80 mt-1">
                        Changing these weights immediately recalibrates the Misal Performance Score for all restaurants. The sum of all weights must equal exactly 1.0.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="flex justify-between text-sm mb-1"><span>Rating (w_R)</span> <span>{mpsWeights.w_R}</span></label>
                      <input type="range" min="0" max="1" step="0.05" value={mpsWeights.w_R} onChange={e => setMpsWeights({...mpsWeights, w_R: parseFloat(e.target.value)})} className="w-full accent-orange-500" />
                    </div>
                    <div>
                      <label className="flex justify-between text-sm mb-1"><span>Satisfaction (w_CS)</span> <span>{mpsWeights.w_CS}</span></label>
                      <input type="range" min="0" max="1" step="0.05" value={mpsWeights.w_CS} onChange={e => setMpsWeights({...mpsWeights, w_CS: parseFloat(e.target.value)})} className="w-full accent-orange-500" />
                    </div>
                    <div>
                      <label className="flex justify-between text-sm mb-1"><span>Value (w_V)</span> <span>{mpsWeights.w_V}</span></label>
                      <input type="range" min="0" max="1" step="0.05" value={mpsWeights.w_V} onChange={e => setMpsWeights({...mpsWeights, w_V: parseFloat(e.target.value)})} className="w-full accent-orange-500" />
                    </div>
                    <div>
                      <label className="flex justify-between text-sm mb-1"><span>Recommendation (w_Rec)</span> <span>{mpsWeights.w_Rec}</span></label>
                      <input type="range" min="0" max="1" step="0.05" value={mpsWeights.w_Rec} onChange={e => setMpsWeights({...mpsWeights, w_Rec: parseFloat(e.target.value)})} className="w-full accent-orange-500" />
                    </div>
                    <div>
                      <label className="flex justify-between text-sm mb-1"><span>Review Popularity (w_RP)</span> <span>{mpsWeights.w_RP}</span></label>
                      <input type="range" min="0" max="1" step="0.05" value={mpsWeights.w_RP} onChange={e => setMpsWeights({...mpsWeights, w_RP: parseFloat(e.target.value)})} className="w-full accent-orange-500" />
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <div className="font-mono text-sm">
                        Sum: <span className={clsx("font-bold", Object.values(mpsWeights).reduce((a,b)=>a+b,0) === 1.0 ? "text-green-500" : "text-red-500")}>
                          {Object.values(mpsWeights).reduce((a,b)=>a+b,0).toFixed(2)}
                        </span>
                      </div>
                      <button onClick={handleSaveWeights} className="btn btn-primary">
                        <Server className="w-4 h-4" /> Save Configuration
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'approve' ? 'Approve Claim' : 'Reject Claim'}
        message={confirmAction?.type === 'approve' 
          ? 'This will transfer ownership of the restaurant to this user. Are you sure?' 
          : 'This will reject the claim and notify the user. Proceed?'}
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.type === 'approve' ? 'default' : 'danger'}
        onConfirm={handleClaimAction}
        onCancel={() => setConfirmAction(null)}
      />
    </main>
  );
}
