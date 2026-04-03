const fs = require('fs');

// --- Configure these to match what you'd set in csvreader.js ---
const CSV_FILE = 'JN_alpha_clean_absolute.csv';
const SELECTED_COLUMNS = [
    "Delta_TP9",
    "Delta_AF7",
    "Delta_AF8",
    "Delta_TP10",
    "Theta_TP9"
];
// ---------------------------------------------------------------

const lines = fs.readFileSync(CSV_FILE, 'utf8').split('\n').filter(l => l.trim().length > 0);
const header = lines[0].split(',');

const colIndices = SELECTED_COLUMNS.map(name => {
    const idx = header.indexOf(name);
    if (idx === -1) console.warn(`Warning: column not found in header: ${name}`);
    return { name, idx };
});

console.log('Resolved columns:');
colIndices.forEach(c => console.log(`  [${c.idx}] ${c.name}`));
console.log();

const dataRows = lines.slice(1);
console.log(`Rows: ${dataRows.length}`);
console.log();

console.log('First 5 rows:');
dataRows.slice(0, 5).forEach((line, i) => {
    const cols = line.split(',');
    const values = colIndices.map(c => parseFloat(cols[c.idx]));
    console.log(`  Row ${i + 1}: ${values.join(', ')}`);
});
