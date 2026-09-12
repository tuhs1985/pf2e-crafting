const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const REVISION = 'aaff60d1625ba92c8d06f41f21b61d4748484dc9';
const SOURCE_PATH = 'src/module/item/physical/materials.ts';
const SNAPSHOT = path.join(__dirname, 'data', 'materials.source.json');
const OUTPUT = path.join(__dirname, 'src', 'data', 'materials.db.json');
const GRADES = { low: 0.1, standard: 0.25, high: 1 };

// Read literal tables through TypeScript's parser; never execute downloaded code.
function literal(node) {
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isObjectLiteralExpression(node)) {
    const entries = node.properties.map(property => {
      if (!ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error('Unsupported upstream material table syntax');
      }
      return [property.name.text, literal(property.initializer)];
    });
    return Object.fromEntries(entries);
  }
  throw new Error('Material table must contain only object, string, number, or null literals');
}

function extractTables(source) {
  const file = ts.createSourceFile(SOURCE_PATH, source, ts.ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length) throw new Error('Invalid upstream TypeScript');
  const tables = {};
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const name = declaration.name.getText(file);
      for (const kind of ['weapon', 'armor']) {
        if (name === `${kind.toUpperCase()}_MATERIAL_VALUATION_DATA`) {
          tables[kind] = literal(declaration.initializer);
        }
      }
    }
  }
  if (!tables.weapon || !tables.armor) throw new Error('Missing weapon or armor table');
  return tables;
}

function buildDatabase(snapshot) {
  const items = [];
  for (const kind of ['weapon', 'armor']) {
    const table = snapshot.tables?.[kind];
    if (!table || !Object.keys(table).length) throw new Error(`Missing ${kind} materials`);
    for (const [material, grades] of Object.entries(table).sort(([a], [b]) => a.localeCompare(b))) {
      if (!material) continue;
      for (const [grade, fraction] of Object.entries(GRADES)) {
        const row = grades[grade];
        if (row === null) continue;
        if (!row || !Number.isInteger(row.level) || row.level < 0 ||
            !Number.isFinite(row.price) || row.price <= 0 ||
            !['common', 'uncommon', 'rare', 'unique'].includes(row.rarity)) {
          throw new Error(`Invalid material: ${kind}/${material}/${grade}`);
        }
        items.push({ kind, material, grade, level: row.level, rarity: row.rarity,
          basePriceGp: row.price, pricePerBulkGp: row.price / 10,
          // The precious material is part of the standard half-price investment.
          minimumMaterialBaseGp: row.price * fraction / 2,
          minimumMaterialPerBulkGp: row.price * fraction / 20 });
      }
    }
  }
  if (!items.length) throw new Error('No materials extracted');
  return { version: 1, source: snapshot.source,
    craftingRules: 'https://2e.aonprd.com/Rules.aspx?ID=3135', items };
}

async function main() {
  let snapshot;
  if (process.argv.includes('--refresh')) {
    const response = await fetch(`https://api.github.com/repos/foundryvtt/pf2e/contents/${SOURCE_PATH}?ref=${REVISION}`,
      { headers: { 'User-Agent': 'pf2e-crafting-material-importer' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const body = await response.json();
    if (body.encoding !== 'base64' || typeof body.content !== 'string') throw new Error('Missing source content');
    snapshot = { source: { repository: 'https://github.com/foundryvtt/pf2e', revision: REVISION,
      path: SOURCE_PATH }, tables: extractTables(Buffer.from(body.content, 'base64').toString('utf8')) };
  } else {
    snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  }
  const database = buildDatabase(snapshot); // Validate before replacing either file.
  if (process.argv.includes('--refresh')) {
    fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
    fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n');
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(database));
  console.log(`Wrote ${database.items.length} weapon/armor material grades to ${OUTPUT}`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { extractTables, buildDatabase };
