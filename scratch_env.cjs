const { execSync } = require('child_process');

const envs = [
  ['VITE_FIREBASE_API_KEY', 'AIzaSyCG38mI-EZ3n7IunfFtpqBkmrZtxfTTymY'],
  ['VITE_FIREBASE_AUTH_DOMAIN', 'misal-analytics.firebaseapp.com'],
  ['VITE_FIREBASE_PROJECT_ID', 'misal-analytics'],
  ['VITE_FIREBASE_STORAGE_BUCKET', 'misal-analytics.firebasestorage.app'],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', '357380214393'],
  ['VITE_FIREBASE_APP_ID', '1:357380214393:web:ff599fb8454992dbdf8ea8']
];

for (const [key, value] of envs) {
  console.log(`Adding ${key}...`);
  try {
    execSync(`npx vercel env add ${key} production,preview,development`, {
      input: value + '\n',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`Successfully added ${key}`);
  } catch (e) {
    console.log(`Failed to add ${key}:`);
    const err = e.stderr.toString();
    console.log(err);
    // If it requires --type plain
    if (err.includes('requires_type')) {
      try {
        console.log(`Retrying ${key} with --type plain...`);
        execSync(`npx vercel env add ${key} production,preview,development --type plain`, {
          input: value + '\n',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        console.log(`Successfully added ${key}`);
      } catch(e2) {
        console.log("Failed again:", e2.stderr.toString());
      }
    }
  }
}
