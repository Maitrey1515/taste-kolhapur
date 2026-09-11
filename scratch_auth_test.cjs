const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if(parts.length >= 2) acc[parts[0].trim()] = parts[1].replace(/\"/g, '').trim();
  return acc;
}, {});

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
});

const auth = getAuth(app);
signInWithEmailAndPassword(auth, 'test@example.com', 'password123')
  .then(() => console.log('Success! Email/Password Auth is enabled.'))
  .catch(e => {
     console.error('Auth Error Code:', e.code);
     console.error('Auth Error Message:', e.message);
  });
