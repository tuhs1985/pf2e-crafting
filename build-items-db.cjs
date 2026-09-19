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

const EQUIP_DIR = path.join(__dirname, 'upstream', 'pf2e', 'packs', 'pf2e', 'equipment');
const OUT_FILE = path.join(__dirname, 'src', 'data', 'items.db.json');

function canCustomizeMaterial(item) {
  if (!['weapon', 'armor', 'shield'].includes(item.type)) return false;
  const sys = item.system || item.data || {};
  const magicalTraits = ['magical', 'arcane', 'divine', 'occult', 'primal'];
  const hasRunes = runes => Object.values(runes ?? {}).some(value =>
    Array.isArray(value) ? value.length > 0 : typeof value === 'number' ? value > 0 : false);
  return !sys.specific && !(sys.traits?.value ?? []).some(trait => magicalTraits.includes(trait)) &&
    !hasRunes(sys.runes) && !hasRunes(sys.traits?.integrated?.runes);
}

function materialMetadata(item) {
  const sys = item.system || item.data || {};
  const bulk = Number(sys.bulk?.value ?? 0);
  const carriedBulk = sys.bulk?.heldOrStowed != null
    ? Number(sys.bulk.heldOrStowed)
    : item.type === 'armor' ? bulk + 1 : bulk;
  const pricePer = Number(sys.price?.per ?? 1);
  if (!Number.isFinite(carriedBulk) || carriedBulk < 0 || !Number.isInteger(pricePer) || pricePer < 1) {
    throw new Error(`Invalid Bulk or price quantity: ${item.name}`);
  }
  return [item.type ?? '', carriedBulk, sys.material?.type ?? null,
    sys.material?.grade ?? null, pricePer, sys.baseItem ?? null, canCustomizeMaterial(item) ? 1 : 0];
}

function getJsonFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return getJsonFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith('.json')
      ? [fullPath]
      : [];
  });
}

function buildDb(inputDir = EQUIP_DIR, outputFile = OUT_FILE) {
  const files = getJsonFiles(inputDir);
  const items = [];

  // Collect all unique values for deduplication
  const raritySet = new Set();
  const categorySet = new Set();
  const bulkSet = new Set();
  const costSet = new Set();

  // First pass: gather items and unique values
  for (const file of files) {
	const filePath = file;
    let item;
    try {
      item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      throw new Error(`Invalid equipment JSON: ${file}`, { cause: e });
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
    const level = sys.level?.value ?? 0;
    if (!Number.isFinite(cost) || cost < 0 || !Number.isInteger(level) || level < 0) {
      throw new Error(`Invalid price or level: ${item.name}`);
    }
    const consumable = (Array.isArray(sys.traits?.value) && sys.traits.value.includes("consumable")) || (item.type === "consumable");

    raritySet.add(rarity);
    categorySet.add(category);
    bulkSet.add(bulk);
    costSet.add(cost);

    items.push({
      name: item.name,
      level,
      rarity,
      category,
      bulk,
      cost,
      consumable,
      metadata: materialMetadata(item),
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  if (!items.length) throw new Error('No equipment found; existing database left unchanged.');
  if (new Set(items.map(item => item.name)).size !== items.length) {
    throw new Error('Duplicate item names; existing database left unchanged.');
  }

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
    v: 3,
    r: rarities,      // rarity lookup
    c: categories,    // category lookup
    b: bulks,         // bulk lookup
    p: costs,         // price/cost lookup
    n: namePool,      // item names
    i: compressed,    // item data arrays
    // Parallel metadata: [itemType, carriedBulk, material, grade, pricePer, baseItem, canCustomizeMaterial]
    m: items.map(item => item.metadata),
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(output)); // No whitespace for max compression

  const sizeKB = (fs.statSync(outputFile).size / 1024).toFixed(2);
  console.log(`✅ Wrote ${items.length} items to ${outputFile}`);
  console.log(`📦 File size: ${sizeKB} KB`);
  console.log(`📊 Lookups: ${rarities.length} rarities, ${categories.length} categories, ${bulks.length} bulks, ${costs.length} costs`);
}

if (require.main === module) buildDb();
module.exports = { buildDb, materialMetadata, canCustomizeMaterial };
