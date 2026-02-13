const fs = require('fs');
const path = require('path');

// Parses Foundry-style price objects { gp: 70 }, { sp: 10 }, etc. Returns decimal GP
function parseCostObj(costValue) {
  if (!costValue || typeof costValue !== 'object') return 0;
  let total = 0;
  if (costValue.gp) total += parseFloat(costValue.gp);
  if (costValue.sp) total += parseFloat(costValue.sp) / 10;
  if (costValue.cp) total += parseFloat(costValue.cp) / 100;
  if (costValue.pp) total += parseFloat(costValue.pp) * 10;
  return total;
}

function parseBulk(bulk) {
  if (bulk == null) return "";
  if (typeof bulk === "object" && 'value' in bulk) return String(bulk.value);
  return String(bulk);
}

const EQUIP_DIR = path.join(__dirname, 'src', 'packs', 'equipment');
const OUT_FILE = path.join(__dirname, 'src', 'data', 'items.db.json');

function buildDb() {
  const files = fs.readdirSync(EQUIP_DIR).filter(f => f.endsWith('.json'));
  const items = [];

  // Collect all unique values for deduplication
  const raritySet = new Set();
  const categorySet = new Set();
  const bulkSet = new Set();
  const costSet = new Set();

  // First pass: gather items and unique values
  for (const file of files) {
    const filePath = path.join(EQUIP_DIR, file);
    let item;
    try {
      item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn(`Skipping ${file} (parse error)`);
      continue;
    }
    if (!item || !item.name || typeof item.name !== 'string' || !item.name.trim()) {
      continue;
    }

    const sys = item.system || item.data || {};
    const rarity = sys.traits?.rarity ?? "common";
    const category = (item.type === "weapon" && sys.group) ? sys.group
                   : sys.category ?? item.type ?? "";
    const bulk = parseBulk(sys.bulk);
    const cost = parseCostObj(sys.price?.value);
    const consumable = (Array.isArray(sys.traits?.value) && sys.traits.value.includes("consumable")) || (item.type === "consumable");

    raritySet.add(rarity);
    categorySet.add(category);
    bulkSet.add(bulk);
    costSet.add(cost);

    items.push({
      name: item.name,
      level: sys.level?.value ?? 0,
      rarity,
      category,
      bulk,
      cost,
      consumable,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  // Create lookup arrays (sorted for consistency)
  const rarities = Array.from(raritySet).sort();
  const categories = Array.from(categorySet).sort();
  const bulks = Array.from(bulkSet).sort();
  const costs = Array.from(costSet).sort((a, b) => a - b);

  // Compress: Convert to array of indices
  // Format per item: [rarityIdx, categoryIdx, bulkIdx, costIdx, consumable, level]
  const namePool = items.map(i => i.name);
  const compressed = items.map(item => [
    rarities.indexOf(item.rarity),
    categories.indexOf(item.category),
    bulks.indexOf(item.bulk),
    costs.indexOf(item.cost),
    item.consumable ? 1 : 0,
    item.level,
  ]);

  // Ultra-compact output with single-letter keys
  const output = {
    r: rarities,      // rarity lookup
    c: categories,    // category lookup
    b: bulks,         // bulk lookup
    p: costs,         // price/cost lookup
    n: namePool,      // item names
    i: compressed,    // item data arrays
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output)); // No whitespace for max compression

  const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(2);
  console.log(`✅ Wrote ${items.length} items to ${OUT_FILE}`);
  console.log(`📦 File size: ${sizeKB} KB`);
  console.log(`📊 Lookups: ${rarities.length} rarities, ${categories.length} categories, ${bulks.length} bulks, ${costs.length} costs`);
}

buildDb();