import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// Global auth state
export const AuthState = {
  user: null,
  profile: null,
  loading: true,
  listeners: []
};

// Listen for changes to auth state
export function subscribeToAuth(callback) {
  AuthState.listeners.push(callback);
  // Initial fire if already loaded
  if (!AuthState.loading) {
    callback(AuthState.user, AuthState.profile);
  }
}

function notifyListeners() {
  AuthState.listeners.forEach(cb => cb(AuthState.user, AuthState.profile));
}

// Fetch user profile from Firestore
async function fetchProfile(userId, firebaseUser) {
  try {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      AuthState.profile = { id: docSnap.id, ...docSnap.data() };
    } else {
      const newProfile = {
        role: 'customer',
        display_name: firebaseUser.displayName || 'User',
      };
      await setDoc(docRef, newProfile);
      AuthState.profile = { id: userId, ...newProfile };
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
    AuthState.profile = { id: userId, role: 'customer', display_name: 'User' };
  }
}

// Initialize Auth Observer
export function initAuth() {
  onAuthStateChanged(auth, async (firebaseUser) => {
    AuthState.user = firebaseUser;
    if (firebaseUser) {
      await fetchProfile(firebaseUser.uid, firebaseUser);
    } else {
      AuthState.profile = null;
    }
    AuthState.loading = false;
    notifyListeners();
  });
}

// Export Auth Methods
export async function signIn(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const docRef = doc(db, 'profiles', user.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        display_name: user.displayName || 'User',
        role: 'customer',
      });
    }
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function signUp(email, password, displayName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, 'profiles', user.uid), {
      display_name: displayName,
      role: 'customer',
    });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
  AuthState.profile = null;
  notifyListeners();
}
