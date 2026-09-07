import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCG38mI-EZ3n7IunfFtpqBkmrZtxfTTymY",
  authDomain: "misal-analytics.firebaseapp.com",
  projectId: "misal-analytics",
  storageBucket: "misal-analytics.firebasestorage.app",
  messagingSenderId: "357380214393",
  appId: "1:357380214393:web:ff599fb8454992dbdf8ea8"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
