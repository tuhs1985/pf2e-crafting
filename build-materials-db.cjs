const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const { execFileSync } = require('node:child_process');
const UPSTREAM = path.join(__dirname, 'upstream', 'pf2e');
const SOURCE_PATH = 'src/module/item/physical/materials.ts';
const SNAPSHOT = path.join(__dirname, 'data', 'materials.source.json');
const OUTPUT = path.join(__dirname, 'src', 'data', 'materials.db.json');
const GRADES = { low: 0.1, standard: 0.25, high: 1 };
const TABLES = { weapon: 'WEAPON', armor: 'ARMOR', buckler: 'BUCKLER',
  shield: 'SHIELD', tower: 'TOWER_SHIELD' };

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
      for (const [kind, prefix] of Object.entries(TABLES)) {
        if (name === `${prefix}_MATERIAL_VALUATION_DATA`) {
          tables[kind] = literal(declaration.initializer);
        }
      }
    }
  }
  if (Object.keys(TABLES).some(kind => !tables[kind])) throw new Error('Missing material table');
  return tables;
}

function buildDatabase(snapshot) {
  const items = [];
  for (const kind of Object.keys(TABLES)) {
    const usesBulk = kind === 'weapon' || kind === 'armor';
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
          basePriceGp: row.price, pricePerBulkGp: usesBulk ? row.price / 10 : 0,
          // The precious material is part of the standard half-price investment.
          minimumMaterialBaseGp: row.price * fraction / 2,
          minimumMaterialPerBulkGp: usesBulk ? row.price * fraction / 20 : 0 });
      }
    }
  }
  if (!items.length) throw new Error('No materials extracted');
  return { version: 1, source: snapshot.source,
    craftingRules: 'https://2e.aonprd.com/Rules.aspx?ID=3135', items };
}

async function main() {
  const revision = execFileSync('git', ['-C', UPSTREAM, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const snapshot = { source: { repository: 'https://github.com/foundryvtt/pf2e', revision,
    path: SOURCE_PATH }, tables: extractTables(fs.readFileSync(path.join(UPSTREAM, SOURCE_PATH), 'utf8')) };
  const database = buildDatabase(snapshot);
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n');
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(database));
  console.log(`Wrote ${database.items.length} equipment material grades to ${OUTPUT}`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { extractTables, buildDatabase };
