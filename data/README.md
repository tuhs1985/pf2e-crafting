# Database regeneration

For everyday instructions, see [Updating equipment and publishing](../UPDATING-PF2E.md).

`npm run setup:pf2e` initializes the pinned sparse submodule. `npm run update:pf2e`
selects the latest stable PF2e system release, imports equipment and materials,
runs tests, and builds. `npm run import:pf2e` uses the current checkout without
advancing it. Both import commands restore generated sources and the checkout
if generation, tests, or build fails.

Equipment is read directly from `upstream/pf2e/packs/pf2e/equipment/`.
The old ignored `src/packs/equipment/` folder is unused. `data/pf2e-version.json`
records the imported release and revision. Commit the submodule pointer along
with generated data after reviewing the update report.

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

Material data includes weapons, armor, bucklers, ordinary shields, and tower shields.
The material importer reads `src/module/item/physical/materials.ts` directly from
the same upstream checkout as equipment. It parses literal tables without executing
upstream TypeScript, and generates both `materials.source.json` (a reproducible
test snapshot) and `src/data/materials.db.json`. No hard-coded download revision
or separate `--refresh` step is needed.

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

Tests validate lookup references, known equipment semantics, and material-table
reproduction. The updater reports added, removed, and changed items rather than
requiring every future release to equal the previous committed database.

### Shield pricing
Shield classification follows Foundry shield/document.ts at the same revision as the material snapshot. Bucklers include Caster's Targe, Dart Shield, Gauntlet Buckler, Heavy Rondache, and Klar. Fortress Shield uses the tower table. Other shields use the ordinary shield table. Shield material prices and required material amounts do not scale with Bulk. Custom items categorized as shield use the ordinary table. The tower table supplies duskwood only; missing material/grade prices are not invented.
