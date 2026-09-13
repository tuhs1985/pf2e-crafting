# Database regeneration

Run from the repository root after `npm install`:

```powershell
node build-items-db.cjs
node build-materials-db.cjs
node --test tests/*.test.cjs
```

Equipment input remains the locally supplied `src/packs/equipment/` Foundry JSON
directory (not committed). The importer writes `src/data/items.db.json` only after
validation. Original price values and bundle semantics are unchanged.

Item schema version 3 preserves all six original row fields and lookup tables.
The parallel `m` array stores `[itemType, carriedBulk, materialType, materialGrade,
pricePer, baseItem, canCustomizeMaterial]` for each name. The final flag is 1 only
for nonmagical, nonspecific weapons, armor, and shields. Specific-item metadata,
magical/tradition traits, and populated runes (including integrated runes) exclude
an item. This prevents material pricing from replacing a named magic item's cost.
Older metadata without the flag disables customization for database items until
regenerated. Custom manually entered items remain available by category.
Armor's carried Bulk is its stored worn Bulk
plus 1 unless an explicit held/stowed value exists. Other items retain their
stored Bulk. The app reader also tolerates the previous format without metadata.

Material data includes weapons, armor, bucklers, ordinary shields, and tower shields. `materials.source.json` is a
checked-in snapshot of the literal tables in Foundry PF2e's materials.ts. It
records the upstream commit and path. Ordinary material regeneration is offline.
To re-download the pinned source, run:

```powershell
node build-materials-db.cjs --refresh
```

To adopt a newer upstream version, deliberately update `REVISION` in that importer,
refresh, and review the diff. Downloaded TypeScript is parsed as literals, never
executed. The generated file is `src/data/materials.db.json` (schema version 1).

Each row records item kind, material, grade, level, rarity, base price, price per
Bulk, and the minimum precious-material amounts. The latter use the general
GM Core fractions of the half-price upfront investment: low 10%, standard 25%,
high 100%. They describe included precious material, not an additional charge.
The material selection UI and price calculations support weapons and armor.
Carried Bulk is rounded down to normal Bulk with a minimum of 1 for pricing,
matching Foundry. The reader retains the original item values separately from the
selected material. Existing material prices are preserved when reselecting the
same material/grade; switching substitutes the priced material component.
Ordinary items use the material item price instead of adding the ordinary price.
This is not a rune or compound-item builder.

Cost Mod, quantity, and downtime apply to the material item price, while the
published precious-material minimum stays unchanged per item (and scales with
quantity). Formula purchases remain separate. Failure summaries label the
precious-material minimum as an initial supply requirement rather than a loss.
No proficiency or build-legality checks are performed. Only combinations with
pricing data appear. Ammunition remains excluded from this feature.

Sources and attribution:
- Foundry PF2e: https://github.com/foundryvtt/pf2e
- Upstream licensing: https://github.com/foundryvtt/pf2e/blob/master/LICENSE
- GM Core precious-material rules: https://2e.aonprd.com/Rules.aspx?ID=3135
- Silver weapon example: https://2e.aonprd.com/Equipment.aspx?ID=2860

The compatibility test compares existing item fields against HEAD. A deliberate
equipment-source update may require reviewing those differences before updating
the baseline; do not discard that protection merely to make a test pass.

### Shield pricing
Shield classification follows Foundry shield/document.ts at the same revision as the material snapshot. Bucklers include Caster's Targe, Dart Shield, Gauntlet Buckler, Heavy Rondache, and Klar. Fortress Shield uses the tower table. Other shields use the ordinary shield table. Shield material prices and required material amounts do not scale with Bulk. Custom items categorized as shield use the ordinary table. The tower table supplies duskwood only; missing material/grade prices are not invented.
