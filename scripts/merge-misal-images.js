import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const masterDataPath = path.resolve(__dirname, '../src/data/tastekolhapur_master_data.json');
const newImagesPath = path.resolve(__dirname, '../local_misal_images.json');

const masterData = JSON.parse(fs.readFileSync(masterDataPath, 'utf-8'));
const newImages = JSON.parse(fs.readFileSync(newImagesPath, 'utf-8'));

// Map images by name
const imageMap = {};
newImages.forEach(img => {
    imageMap[img.name] = img.cover_image;
});

// Update master data
masterData.forEach(hotel => {
    if (imageMap[hotel.name]) {
        hotel.cover_image = imageMap[hotel.name];
    }
});

fs.writeFileSync(masterDataPath, JSON.stringify(masterData, null, 2));
console.log("Successfully updated tastekolhapur_master_data.json with scraped images!");
