import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dummyPhotos = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1414235077428-338988a2e8c0?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1590846406792-0adc7f928f1e?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800"
];

const dummyReviews = [
  { text: "Absolutely loved the authentic taste! The ambiance is great and the staff is very polite.", rating: 5, author: "Rahul P." },
  { text: "Good food, decent portions. A bit crowded during lunch hours but worth the wait.", rating: 4, author: "Sneha M." },
  { text: "Best Misal in town! The spice level was perfect.", rating: 5, author: "Aditya S." },
  { text: "Nice family restaurant. The thali was very fulfilling.", rating: 4, author: "Priya K." },
  { text: "Average experience, the service could be faster. Food is okay.", rating: 3, author: "Vikram R." }
];

async function generateDummyData() {
  console.log("Fetching restaurants from Firebase...");
  const snap = await getDocs(collection(db, 'restaurants'));
  const restaurants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log(`Found ${restaurants.length} restaurants. Injecting dummy data...`);

  for (const r of restaurants) {
    // Random rating between 4.0 and 4.9
    const rating = (Math.random() * (4.9 - 4.0) + 4.0).toFixed(1);
    // Random review count between 50 and 800
    const reviews = Math.floor(Math.random() * (800 - 50 + 1)) + 50;
    // Random photo
    const cover_image = dummyPhotos[Math.floor(Math.random() * dummyPhotos.length)];

    await updateDoc(doc(db, 'restaurants', r.id), {
      google_rating: parseFloat(rating),
      google_reviews: reviews,
      cover_image: cover_image,
      updated_at: new Date().toISOString()
    });

    console.log(`Updated ${r.name} - Rating: ${rating}, Reviews: ${reviews}`);

    // Generate 2 random reviews
    for (let i = 0; i < 2; i++) {
      const reviewTemplate = dummyReviews[Math.floor(Math.random() * dummyReviews.length)];
      const reviewId = `dummy_${r.id}_${i}`;
      
      await setDoc(doc(db, 'reviews', reviewId), {
        restaurant_id: r.id,
        user_id: 'dummy_user',
        source: 'google',
        overall_rating: reviewTemplate.rating,
        written_review: reviewTemplate.text,
        author_name: reviewTemplate.author,
        author_photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewTemplate.author)}&background=random`,
        visit_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verified_visit: true
      }, { merge: true });
    }
  }
  
  console.log("\nDummy Data Injection Complete!");
  process.exit(0);
}

generateDummyData().catch(console.error);
