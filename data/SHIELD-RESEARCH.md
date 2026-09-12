# Shield research / restart checkpoint — 2026-09-12

User authorized a focused investigation after the quota cutoff. No shield feature
has been enabled. Current uncommitted importer work is complete for weapons and
armor: equipment metadata, material snapshot/database, reader, docs, and tests.
21 tests passed; app typecheck still has three pre-existing unused parameters.
Nothing committed or deployed from that work.

Foundry current upstream shield/document.ts explicitly classifies baseItem:
- Buckler table: buckler, casters-targe, dart-shield, gauntlet-buckler,
  heavy-rondache, klar.
- Tower table: fortress-shield, tower-shield.
- Otherwise: ordinary shield material table.

Cross-checked local Treasure Vault equipment: Fortress Shield maps to tower;
Caster's Targe, Dart Shield, Gauntlet Buckler, Heavy Rondache, Klar map to buckler;
Harnessed Shield, Hide Shield, Meteor Shield, Razor Disc, Salvo Shield,
Swordstealer Shield map to ordinary shield. Magnetic Shield also appears in the
nonmagical search but is an alchemical item (baseItem steel-shield), so do not
mistake this search for a list of plain base shields.

physical/materials.ts uses those getters to select a table. physical/helpers.ts
sets shield pricing Bulk to zero, so no weapon/armor-style Bulk surcharge. Its
specific-item guard must be considered separately. No claim that every material
exists in every table: check null grades and the tower table before implementation.
Do not invent missing prices. User wants flexibility, not rules enforcement.

The new equipment metadata already preserves baseItem. Future shield import should
preserve the three tables rather than create a price row per named shield. Before
shipping, pin the classification source too and verify against the material-table
revision. Hardness/HP behavior was not fully inspected and is not needed for this
crafting-cost UI. Material-required craft amounts still need verification for
shield-specific exceptions. Weapons/armor-only checkbox scope remains current.

Sources inspected (master as of this research; not a pinned implementation):
- https://raw.githubusercontent.com/foundryvtt/pf2e/master/src/module/item/shield/document.ts
- https://raw.githubusercontent.com/foundryvtt/pf2e/master/src/module/item/physical/materials.ts
- https://raw.githubusercontent.com/foundryvtt/pf2e/master/src/module/item/physical/helpers.ts

Next work: review uncommitted importer diff, retain unchanged old item pricing,
then implement requested material controls/calculations. Confirm whether the user
wants shields in that version before expanding beyond weapons and armor.
