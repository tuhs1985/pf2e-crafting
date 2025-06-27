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
  const result = [];

  for (const file of files) {
    const filePath = path.join(EQUIP_DIR, file);
    let item;
    try {
      item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn(`Skipping ${file} (parse error)`);
      continue;
    }
    if (!item || !item.name) {
      console.warn(`Skipping ${file} (missing name)`);
      continue;
    }
    const sys = item.system || item.data || {};
    result.push({
      name: item.name,
      level: sys.level?.value ?? 0,
      rarity: sys.traits?.rarity ?? "common",
      category: (item.type === "weapon" && sys.group) ? sys.group
               : sys.category ?? item.type ?? "",
      bulk: parseBulk(sys.bulk),
      cost: parseCostObj(sys.price?.value),
      consumable: (Array.isArray(sys.traits?.value) && sys.traits.value.includes("consumable")) || (item.type === "consumable"),
    });
  }
  // Remove items without a name
  const filteredResult = result.filter(item => typeof item.name === "string" && item.name.trim().length > 0);
  filteredResult.sort((a, b) => a.name.localeCompare(b.name));
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(filteredResult, null, 2));
  console.log(`Wrote ${filteredResult.length} items to ${OUT_FILE}`);
}

buildDb();