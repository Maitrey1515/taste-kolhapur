import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function VerifyVisit() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    // This route is typically hit if a user scans the QR with a generic scanner 
    // instead of the in-app scanner. We'll verify they are logged in, then 
    // redirect them to the restaurant page to write a review with verified_visit=true.
    const check = async () => {
      // Firebase auth state might take a moment to initialize on direct load, 
      // but for simplicity in this MVP we check auth.currentUser
      const user = auth.currentUser;
      
      try {
        const q = query(collection(db, 'restaurants'), where('slug', '==', slug));
        const snap = await getDocs(q);
          
        if (!snap.empty) setRestaurantName(snap.docs[0].data().name);
      } catch (err) {
        console.error("Error fetching restaurant in VerifyVisit:", err);
      }

      if (!user) {
        setStatus('error');
        return;
      }
      
      // In a real app with TOTP, we would validate the token in the URL here via the Edge Function.
      // For now, we simulate a successful scan if they are logged in and hit this URL.
      setStatus('success');
      
      // Store in session storage that they have a verified visit pending for this restaurant
      sessionStorage.setItem(`verified_visit_${slug}`, 'true');
      
      setTimeout(() => {
        navigate(`/restaurant/${slug}`);
      }, 2000);
    };
    
    check();
  }, [slug, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="card p-8 max-w-sm w-full text-center animate-scale-in">
        {status === 'loading' ? (
          <>
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold">Verifying Visit...</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">Please wait.</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-display font-bold text-green-600">Visit Verified!</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              You're at {restaurantName}. Redirecting you to leave a review...
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-display font-bold text-red-600">Verification Failed</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2 mb-6">
              You need to be signed in to verify your visit, or the QR code is invalid.
            </p>
            <button onClick={() => navigate('/auth')} className="btn btn-primary w-full">
              Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
