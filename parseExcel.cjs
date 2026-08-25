const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbook = xlsx.readFile(path.join(__dirname, 'Hotel_Master.xlsx'));
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

let sql = '-- Data from Hotel_Master.xlsx\n';
sql += 'insert into public.restaurants (\n';
sql += '  hotel_id, name, slug, area, address, city, phone, price_level, approx_price, seating_capacity, established_year, weekly_off, opening_hours, features, peak_hours, cover_image, taste_score, review_count, mps_score, google_rating, google_reviews\n';
sql += ') values\n';

const values = data.map(row => {
  const hotel_id = row['Hotel_ID'] || row['id'] || row['ID'] || `HM${Math.floor(Math.random()*1000)}`;
  const name = row['Name'] || row['Restaurant Name'] || row['name'] || 'Unknown Misal';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random()*100);
  const area = row['Area'] || row['Neighborhood'] || row['area'] || 'Kolhapur';
  const address = row['Address'] || row['address'] || '';
  const city = row['City'] || row['city'] || 'Kolhapur';
  const phone = row['Phone'] || row['Contact'] || row['phone'] || '';
  
  // Try to parse some realistic values or default them
  const price_level = Math.max(1, Math.min(4, Math.floor((row['Price_Level'] || row['Price'] || 2))));
  const approx_price = row['Approx_Price'] || row['Cost for Two'] || (price_level * 100);
  const seating_capacity = row['Seating_Capacity'] || row['Capacity'] || 50;
  const established_year = row['Established_Year'] || row['Year'] || 2000;
  const weekly_off = row['Weekly_Off'] || row['Closed_On'] || 'None';
  
  const opening_hours = '{"default": "08:00 - 16:00"}';
  const features = '{"veg": true, "parking": true, "family_friendly": true}';
  const peak_hours = '{"default": ["09:00", "11:00"]}';
  
  const cover_image = row['Image'] || row['Cover'] || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80';
  
  const taste_score = row['Taste_Score'] || row['Rating'] || 4.0;
  const review_count = row['Review_Count'] || row['Reviews'] || 100;
  const mps_score = row['MPS_Score'] || row['MPS'] || 7.0;
  const google_rating = row['Google_Rating'] || row['Google'] || 4.0;
  const google_reviews = row['Google_Reviews'] || 100;

  return `(
  '${hotel_id.toString().replace(/'/g, "''")}', '${name.toString().replace(/'/g, "''")}', '${slug}', '${area.toString().replace(/'/g, "''")}', '${address.toString().replace(/'/g, "''")}', '${city.toString().replace(/'/g, "''")}', '${phone.toString().replace(/'/g, "''")}',
  ${price_level}, ${approx_price}, ${seating_capacity}, ${established_year}, '${weekly_off.toString().replace(/'/g, "''")}',
  '${opening_hours}', '${features}', '${peak_hours}', '${cover_image}',
  ${taste_score}, ${review_count}, ${mps_score}, ${google_rating}, ${google_reviews}
)`;
});

sql += values.join(',\n') + ';\n';
fs.writeFileSync(path.join(__dirname, 'supabase', 'seed.sql'), sql, 'utf8');
