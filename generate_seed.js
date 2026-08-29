import fs from 'fs/promises';
import path from 'path';

async function main() {
  const dataPath = path.resolve(process.cwd(), 'tastekolhapur_master_data.json');
  const rawData = await fs.readFile(dataPath, 'utf-8');
  const restaurants = JSON.parse(rawData);

  let sql = `-- Seed data generated from tastekolhapur_master_data.json\n\n`;

  for (const r of restaurants) {
    const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    let cover_image = null;
    if (r.google_places && r.google_places.photos && r.google_places.photos.length > 0) {
      cover_image = r.google_places.photos[0].url;
    }

    const name = r.name.replace(/'/g, "''");
    const address = (r.google_places?.verified_address || '').replace(/'/g, "''");
    const best_selling_dish = (r.operations?.best_selling_dish || '').replace(/'/g, "''");
    const marketing_channels = (r.operations?.marketing_channels || '').replace(/'/g, "''");
    const biggest_challenge = (r.operations?.biggest_challenge || '').replace(/'/g, "''");
    const peak_working_days = (r.operations?.peak_working_days || '').replace(/'/g, "''");
    const approx_price = parseInt((r.approx_price || '').replace(/[^0-9]/g, '')) || 200;

    sql += `
WITH new_restaurant AS (
  INSERT INTO public.restaurants (
    hotel_id, name, slug, area, address, city, lat, lng, google_place_id, phone, website, upi, price_level, approx_price, seating_capacity, established_year, weekly_off, employees, opening_hours, features, peak_hours, cover_image, peak_customers_per_day, best_selling_dish, marketing_channels, biggest_challenge, peak_working_days, google_rating, google_reviews, claimed
  ) VALUES (
    '${r.hotel_id}', '${name}', '${slug}', '${r.area}', '${address}', 'Kolhapur', 
    ${r.google_places?.lat || 'NULL'}, ${r.google_places?.lng || 'NULL'}, 
    ${r.google_places?.place_id ? "'" + r.google_places.place_id + "'" : 'NULL'}, 
    '${r.google_places?.phone || ''}', '${r.google_places?.website || ''}', 
    '${r.upi === 'yes' ? 'yes' : 'no'}', 2, ${approx_price}, 
    ${r.seating_capacity ? "'" + r.seating_capacity + "'" : 'NULL'}, 
    ${r.established_year || 'NULL'}, '${r.weekly_off || ''}', 
    ${r.employees ? "'" + r.employees + "'" : 'NULL'}, 
    '{"default": "${r.opening_time || '09:00:00'} - ${r.closing_time || '20:00:00'}"}'::jsonb, 
    '{"parking": ${r.parking === 'yes'}, "ac": false, "veg": true, "delivery": ${r.delivery === 'yes'}, "takeaway": true, "family_friendly": true, "wheelchair": false}'::jsonb, 
    '{"default": [${r.operations?.peak_hours ? '"' + r.operations.peak_hours + '"' : ''}]}'::jsonb, 
    ${cover_image ? "'" + cover_image + "'" : 'NULL'}, 
    ${r.operations?.approx_customers_per_day ? "'" + r.operations.approx_customers_per_day + "'" : 'NULL'}, 
    '${best_selling_dish}', '${marketing_channels}', '${biggest_challenge}', '${peak_working_days}', 
    ${r.source_dataset?.google_rating || r.google_places?.live_rating || 'NULL'}, 
    ${r.source_dataset?.google_reviews || r.google_places?.live_review_count || 'NULL'}, 
    false
  ) ON CONFLICT (hotel_id) DO NOTHING RETURNING id
)
`;

    if (r.menu) {
      const items = [];
      if (r.menu.regular_misal_price) items.push(`('Regular Misal', '${r.menu.regular_misal_price}', true)`);
      if (r.menu.special_misal_price) items.push(`('Special Misal', '${r.menu.special_misal_price}', true)`);
      if (r.menu.tea_coffee_price) items.push(`('Tea/Coffee', '${r.menu.tea_coffee_price}', false)`);
      if (r.menu.buttermilk_price) items.push(`('Buttermilk', '${r.menu.buttermilk_price}', false)`);
      if (r.menu.solkadhi_price) items.push(`('Solkadhi', '${r.menu.solkadhi_price}', false)`);
      if (r.menu.other_items) {
        const others = String(r.menu.other_items).split(',');
        for (const o of others) {
          if (o.trim()) {
            items.push(`('${o.trim().replace(/'/g, "''")}', NULL, false)`);
          }
        }
      }

      if (items.length > 0) {
        sql += `
INSERT INTO public.menu_items (restaurant_id, item_name, price_range, is_signature)
SELECT id, item.item_name, item.price_range, item.is_signature
FROM new_restaurant
CROSS JOIN (VALUES
  ${items.join(',\n  ')}
) AS item(item_name, price_range, is_signature);
`;
      }
    }
  }

  await fs.writeFile(path.resolve(process.cwd(), 'supabase', 'seed.sql'), sql);
  console.log('Generated supabase/seed.sql successfully.');
}

main().catch(console.error);
