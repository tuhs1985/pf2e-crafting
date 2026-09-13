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

## Implementation update

## User override to implement next

SUPERSEDED: The user withdrew this override on 2026-09-12 ("Axe that idea.
Shields are fine."). Keep the current published shield options; do not implement
the fallback described below. New issue to investigate: named magical weapons,
armor, and shields must not be customized with materials or have their listed
prices replaced by a cheaper material price. No implementation authorized yet.

The user explicitly rejects restricting tower/fortress shields to duskwood.
This app is a flexible builder, not a rules validator. Allow other materials,
including adamantine, for GM-approved tower/fortress shield builds. This overrides
the previous decision to offer only entries present in Foundry's tower table.
No code change made for this override yet. Next session: agree on or explain a
pricing fallback for missing tower/material combinations rather than claiming
those prices are published in Foundry, then broaden the material options. Do not
re-ask whether these combinations should be allowed; the user has authorized them.
Shield import and controls are now implemented locally, not committed or deployed. All five tables are extracted at the existing pinned revision; classification getters were verified at that revision too. 129 total material-grade rows, 32 passing tests, production build passed. Browser acceptance remains for the user. The tower table contains duskwood only. This supersedes the earlier weapons/armor-only checkpoint above.
