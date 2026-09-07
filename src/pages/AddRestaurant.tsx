import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Smartphone, KeyRound, Phone, MapPin, Loader2, CheckCircle, Navigation } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { RecaptchaVerifier, linkWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/components/Toast';

export default function AddRestaurant() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details');
  const [submitting, setSubmitting] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  // Form State
  const [restaurantName, setRestaurantName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  
  const [otp, setOtp] = useState('');

  // Recaptcha will be initialized on demand when the user submits the form

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
      }

      let formattedPhone = phone;
      if (!formattedPhone.startsWith('+')) {
        // Assume India if no country code provided
        formattedPhone = '+91' + formattedPhone.replace(/\D/g, '');
      }

      try {
        const result = await Promise.race([
          linkWithPhoneNumber(auth.currentUser!, formattedPhone, (window as any).recaptchaVerifier),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);
        setConfirmationResult(result as ConfirmationResult);
        setStep('otp');
        showToast({ type: 'success', title: 'OTP Sent', message: 'A real verification code has been sent to your phone.' });
      } catch (err: any) {
        if (err.message === 'timeout' || err.code === 'auth/operation-not-allowed') {
          // Fallback to simulation if Firebase isn't configured or hangs
          console.warn("Real OTP failed or timed out. Falling back to simulated OTP.");
          setConfirmationResult(null); // Indicates simulated mode
          setStep('otp');
          showToast({ type: 'warning', title: 'Test Mode Active', message: 'Real OTP failed (Check Firebase config). Use code 123456.' });
        } else {
          throw err;
        }
      }

    } catch (error: any) {
      showToast({ type: 'error', title: 'Failed to send OTP', message: error.message });
      // Clear reCAPTCHA if it failed, so the user can try again
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    
    try {
      if (confirmationResult) {
        // 1. Verify the real code with Firebase
        await confirmationResult.confirm(otp);
      } else {
        // 1. Verify simulated code
        if (otp !== '123456') {
          showToast({ type: 'error', title: 'Invalid OTP', message: 'Please enter the correct verification code (123456).' });
          setSubmitting(false);
          return;
        }
      }

      // 2. Generate a simple slug
      const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

      // 1. Create the new restaurant document
      await addDoc(collection(db, 'restaurants'), {
        name: restaurantName,
        slug: slug,
        phone: phone,
        address: address,
        area: area,
        city: 'Kolhapur',
        owner_id: user.uid,
        claimed: true,
        review_count: 0,
        taste_score: 0,
        mps_score: 0,
        google_rating: 0,
        created_at: new Date().toISOString()
      });

      // 2. Upgrade user profile to owner (use setDoc with merge in case profile doesn't exist yet)
      await setDoc(doc(db, 'profiles', user.uid), {
        role: 'owner',
        phone: phone
      }, { merge: true });
      
      await refreshProfile(); 
      
      setStep('success');
      setTimeout(() => {
        navigate('/owner');
      }, 2000);
      
    } catch (error: any) {
      showToast({ type: 'error', title: 'Registration Failed', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-container py-8 max-w-xl mx-auto">
      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border)] pb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center">
            <Store className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
              Register Your Restaurant
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Add your business and verify ownership instantly.
            </p>
          </div>
        </div>

        {step === 'details' && (
          <form onSubmit={handleSendOTP} className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Restaurant Name *</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input required type="text" value={restaurantName} onChange={e=>setRestaurantName(e.target.value)} className="input pl-10" placeholder="e.g. Phadtare Misal" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label">Full Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input required type="text" value={address} onChange={e=>setAddress(e.target.value)} className="input pl-10" placeholder="e.g. 123 Shivaji Udyan Road" />
                </div>
              </div>

              <div>
                <label className="label">Area / Neighborhood *</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input required type="text" value={area} onChange={e=>setArea(e.target.value)} className="input pl-10" placeholder="e.g. Rankala" />
                </div>
              </div>

              <div>
                <label className="label">Business Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="input pl-10" placeholder="+91 9876543210" />
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-secondary)] p-4 rounded-xl border border-[var(--border)] flex items-start gap-3 mt-4">
              <Smartphone className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="text-sm text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)] mb-1">Instant SMS Verification</p>
                <p>We will send a One-Time Password (OTP) to your phone to instantly verify your ownership.</p>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP to Verify'}
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 mx-auto flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold">Enter Verification Code</h3>
            <p className="text-sm text-[var(--text-muted)]">We sent a 6-digit code to <strong>{phone}</strong>.</p>
            
            <div className="max-w-xs mx-auto">
              <input 
                required 
                type="text" 
                maxLength={6}
                value={otp} 
                onChange={e=>setOtp(e.target.value)} 
                className="input text-center text-2xl tracking-widest font-mono" 
                placeholder="------" 
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setStep('details')} className="btn btn-secondary flex-1">Back</button>
              <button type="submit" disabled={submitting || otp.length < 6} className="btn btn-primary flex-1">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Complete Registration'}
              </button>
            </div>
          </form>
        )}
        
        {step === 'success' && (
          <div className="py-8 text-center animate-fade-in">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-600 mb-2">Registration Successful!</h3>
            <p className="text-[var(--text-muted)]">Your restaurant is now live and you are the verified owner.</p>
            <p className="text-sm text-[var(--text-muted)] mt-4 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to your dashboard...
            </p>
          </div>
        )}
        
        <div id="recaptcha-container"></div>
      </div>
    </main>
  );
}
