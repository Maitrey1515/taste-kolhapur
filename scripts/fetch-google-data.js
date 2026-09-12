import axios from 'axios';
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

// Use Google API key if available, otherwise try the Firebase API key (often the same project)
const API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_FIREBASE_API_KEY;

async function fetchGoogleData() {
  if (!API_KEY) {
    console.error("No API key found. Please set VITE_GOOGLE_MAPS_API_KEY or VITE_FIREBASE_API_KEY.");
    process.exit(1);
  }

  console.log("Fetching restaurants from Firebase...");
  const snap = await getDocs(collection(db, 'restaurants'));
  const restaurants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log(`Found ${restaurants.length} restaurants. Beginning Google Places sync...`);

  for (const r of restaurants) {
    try {
      console.log(`\nProcessing: ${r.name}`);
      
      // 1. Text Search to find the Place ID
      const query = `${r.name} Kolhapur`;
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
      
      const searchRes = await axios.get(searchUrl);
      if (searchRes.data.status !== 'OK' || !searchRes.data.results.length) {
        console.log(`  -> Search Failed or No Results: ${searchRes.data.status}`);
        if (searchRes.data.error_message) console.log(`  -> Error: ${searchRes.data.error_message}`);
        continue;
      }

      const place = searchRes.data.results[0];
      const placeId = place.place_id;
      console.log(`  -> Found Place ID: ${placeId}`);

      // 2. Place Details to get Reviews and Photos
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews,photos&key=${API_KEY}`;
      const detailsRes = await axios.get(detailsUrl);
      
      if (detailsRes.data.status !== 'OK') {
        console.log(`  -> Details Failed: ${detailsRes.data.status}`);
        continue;
      }

      const details = detailsRes.data.result;
      
      // Extract photo URL if available
      let coverPhotoUrl = null;
      if (details.photos && details.photos.length > 0) {
        const photoRef = details.photos[0].photo_reference;
        coverPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${API_KEY}`;
      }

      // Update Restaurant Document
      await updateDoc(doc(db, 'restaurants', r.id), {
        google_place_id: placeId,
        google_rating: details.rating || r.google_rating || null,
        google_reviews: details.user_ratings_total || r.google_reviews || 0,
        cover_image: coverPhotoUrl || r.cover_image || null,
        updated_at: new Date().toISOString()
      });
      console.log(`  -> Updated Restaurant Data (Rating: ${details.rating}, Photos: ${details.photos ? details.photos.length : 0})`);

      // 3. Save Reviews
      if (details.reviews && details.reviews.length > 0) {
        let newReviews = 0;
        for (const review of details.reviews) {
          // Check if this review already exists (use a hash or composite ID)
          const reviewId = `google_${placeId}_${review.time}`;
          const reviewRef = doc(db, 'reviews', reviewId);
          
          await setDoc(reviewRef, {
            restaurant_id: r.id,
            user_id: 'google_user',
            source: 'google',
            overall_rating: review.rating,
            written_review: review.text,
            author_name: review.author_name,
            author_photo: review.profile_photo_url,
            visit_date: new Date(review.time * 1000).toISOString(),
            created_at: new Date(review.time * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            verified_visit: true
          }, { merge: true });
          newReviews++;
        }
        console.log(`  -> Imported ${newReviews} reviews from Google.`);
      }

    } catch (err) {
      console.error(`  -> Error processing ${r.name}:`, err.message);
    }
    
    // Slight delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log("\nGoogle Places Sync Complete!");
  process.exit(0);
}

fetchGoogleData();
