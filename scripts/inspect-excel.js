import xlsx from 'xlsx';

const workbook = xlsx.readFile('C:/Users/Maitrey/Downloads/TasteKolhapur_All_Hotels_Seed.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(worksheet);

if (data.length > 0) {
  console.log("Columns:", Object.keys(data[0]));
  console.log("First row sample:", JSON.stringify(data[0], null, 2));
  console.log(`Total rows: ${data.length}`);
} else {
  console.log("File is empty.");
}
