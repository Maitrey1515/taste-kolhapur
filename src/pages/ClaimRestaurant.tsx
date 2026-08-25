import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Upload, FileText, Building, Phone, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Restaurant } from '@/types';
import { showToast } from '@/components/Toast';

export default function ClaimRestaurant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Owner');
  const [proof, setProof] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.claimed) {
            showToast({ type: 'error', title: 'Already Claimed', message: 'This restaurant is already claimed.' });
            navigate(`/restaurant/${data.slug}`);
          } else {
            setRestaurant(data as Restaurant);
          }
        }
        setLoading(false);
      });
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !restaurant) return;
    
    setSubmitting(true);
    
    // In a real app, upload proof file to Supabase Storage here.
    // We'll simulate a submission to an admin queue table.
    
    const { error } = await supabase.from('claims').insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      full_name: fullName,
      phone,
      business_role: role,
      status: 'pending'
    });
    
    setSubmitting(false);
    
    if (error) {
      showToast({ type: 'error', title: 'Submission Failed', message: error.message });
    } else {
      showToast({ type: 'success', title: 'Claim Submitted', message: 'Our team will verify and get back to you shortly.', duration: 5000 });
      navigate(`/restaurant/${restaurant.slug}`);
    }
  };

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500"/></div>;
  if (!restaurant) return <div className="py-20 text-center">Restaurant not found.</div>;

  return (
    <main className="page-container py-8 max-w-3xl">
      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center">
            <Shield className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
              Claim {restaurant.name}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Verify your ownership to manage details, events, and respond to reviews.
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface-secondary)] p-4 rounded-xl border border-[var(--border)] mb-8 flex items-start gap-3">
          <FileText className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
          <div className="text-sm text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Verification Process</p>
            <p>1. Submit your contact details and business proof (FSSAI license, utility bill, etc.).</p>
            <p>2. Our team will review the documents within 48 hours.</p>
            <p>3. Once approved, your account will be upgraded to 'Owner' and this restaurant will be assigned to you.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input required type="text" value={fullName} onChange={e=>setFullName(e.target.value)} className="input pl-10" />
              </div>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="input pl-10" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Your Role at the Business</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <select value={role} onChange={e=>setRole(e.target.value)} className="input pl-10">
                <option>Owner</option>
                <option>Manager</option>
                <option>Marketing Representative</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Business Proof Document (FSSAI, GST, etc.)</label>
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-orange-500 transition-colors cursor-pointer" onClick={() => document.getElementById('proof-upload')?.click()}>
              <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Click to upload document</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{proof ? proof.name : 'PDF, JPG, PNG (Max 5MB)'}</p>
              <input 
                id="proof-upload" 
                type="file" 
                className="hidden" 
                accept=".pdf,image/*"
                onChange={e => { if (e.target.files?.[0]) setProof(e.target.files[0]); }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting || !proof} className="btn btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

// Just an inline icon helper
function UserIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
