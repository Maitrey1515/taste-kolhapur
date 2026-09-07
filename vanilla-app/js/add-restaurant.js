import { initAuth, AuthState, subscribeToAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { getAuth, RecaptchaVerifier, linkWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { collection, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { showToast, showGlobalLoading } from './utils.js';

initAuth();
initNavbar();

const authInstance = getAuth();
let confirmationResult = null;
let currentStep = 'details';

document.addEventListener('DOMContentLoaded', () => {
  subscribeToAuth((user) => {
    if (user) {
      document.getElementById('login-prompt').classList.add('hidden');
      if (currentStep === 'details') {
        document.getElementById('step-details').classList.remove('hidden');
      }
    } else {
      document.getElementById('login-prompt').classList.remove('hidden');
      document.getElementById('step-details').classList.add('hidden');
    }
  });

  if (window.lucide) window.lucide.createIcons();
});

// Helper to switch steps
function setStep(step) {
  currentStep = step;
  ['details', 'otp', 'success'].forEach(s => {
    document.getElementById(`step-${s}`).classList.add('hidden');
  });
  document.getElementById(`step-${step}`).classList.remove('hidden');
}

// 1. Send OTP
document.getElementById('step-details').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!AuthState.user) return;
  
  const phone = document.getElementById('phone').value;
  let formattedPhone = phone;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+91' + formattedPhone.replace(/\D/g, ''); // Assume India
  }

  showGlobalLoading(true);
  try {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(authInstance, 'recaptcha-container', {
        size: 'invisible'
      });
    }

    try {
      const result = await Promise.race([
        linkWithPhoneNumber(authInstance.currentUser, formattedPhone, window.recaptchaVerifier),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]);
      confirmationResult = result;
      document.getElementById('display-phone').textContent = formattedPhone;
      setStep('otp');
      showToast('A real verification code has been sent to your phone.');
    } catch (err) {
      if (err.message === 'timeout' || err.code === 'auth/operation-not-allowed') {
        console.warn("Real OTP failed or timed out. Falling back to simulated OTP.");
        confirmationResult = null;
        document.getElementById('display-phone').textContent = formattedPhone;
        setStep('otp');
        showToast('Real OTP failed. Use code 123456.');
      } else {
        throw err;
      }
    }
  } catch (error) {
    alert('Failed to send OTP: ' + error.message);
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  } finally {
    showGlobalLoading(false);
  }
});

// 2. Verify OTP and Save
document.getElementById('step-otp').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!AuthState.user) return;
  
  const otp = document.getElementById('otp').value;
  showGlobalLoading(true);

  try {
    if (confirmationResult) {
      await confirmationResult.confirm(otp);
    } else {
      if (otp !== '123456') {
        alert('Invalid OTP. Please enter 123456 in test mode.');
        showGlobalLoading(false);
        return;
      }
    }

    const name = document.getElementById('name').value;
    const address = document.getElementById('address').value;
    const area = document.getElementById('area').value;
    const phone = document.getElementById('phone').value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

    // Create restaurant
    await addDoc(collection(db, 'restaurants'), {
      name: name,
      slug: slug,
      phone: phone,
      address: address,
      area: area,
      city: 'Kolhapur',
      owner_id: AuthState.user.uid,
      claimed: true,
      review_count: 0,
      taste_score: 0,
      mps_score: 0,
      google_rating: 0,
      created_at: new Date().toISOString()
    });

    // Upgrade user profile
    await setDoc(doc(db, 'profiles', AuthState.user.uid), {
      role: 'owner',
      phone: phone
    }, { merge: true });

    setStep('success');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 2000);
    
  } catch (error) {
    alert('Registration Failed: ' + error.message);
  } finally {
    showGlobalLoading(false);
  }
});

document.getElementById('btn-back').addEventListener('click', () => {
  setStep('details');
});
