# Feature backlog

This is a planning checklist, not a promise to implement every item. Status was checked against the local app on September 27, 2026. Effort estimates are relative and should be revisited when a feature is selected.

| # | Status | Idea | Assessment / next decision |
|---|---|---|---|
| 1 | [x] Done | Days to minimum cost | Live current cost, minimum cost, and days to reach it are implemented and deployed. |
| 2 | [ ] Deferred | Target-cost mode | Reverse-calculating days is feasible (small effort), but the live cost changes as Additional Days changes. The owner preferred that simpler interaction and did not want target-cost mode for now. |
| 3 | [ ] Open | Target-date mode | Given a deadline, show affordable cost by that date. Small effort if it only derives days from the existing start date and calculation. Decide how past deadlines and setup days should read. |
| 4 | [ ] Deferred | Recent crafts / history | Low value for the owner's use: crafts are rarely repeated. Full-project restore would still be medium effort, so do not prioritize unless that need changes. |
| 5 | [ ] Open, low priority | Favorite items | Small to medium effort, but likely little benefit if items are not repeated often. Revisit only if recurring consumables become common. |
| 6 | [ ] Open | Formula book per character | Medium effort. Needs per-character ownership, item lookup, and a fallback when an upstream item is renamed or removed. |
| 7 | [ ] Open, low priority | Crafting project queue | Medium to large effort. Requires multiple projects and a clear model for ordering, dates, interruptions, and completion. Consider only if tracking several simultaneous crafts becomes useful. |
| 8 | [ ] Open | Output format selector | Small for a second fixed plain-text format; more if users can customize templates. Worth revisiting because output has sometimes needed manual editing. |
| 9 | [ ] Open | Item search filters | Small to medium effort. Current suggestions match name text; category and rarity do not filter them. Useful mainly when browsing rather than entering a known item. |
| 10 | [ ] Open | Property-rune builder | Medium to large effort, depending on scope. The app can stay flexible about legal combinations, but rune prices, names, capacity display, and interaction with magic presets and upgrades still need design. |
| 11 | [ ] Open | Precious-material ammunition | Medium effort, possibly more if the source data lacks a reliable purchase quantity or material-pricing basis. Batch costs need careful handling. |
| 12 | [ ] Partial | Crafting profitability view | The fee and total charged already exist. A separate profit or gp/day display is small effort mathematically, but first define whether “profit” means the fee alone and which days count. |
| 13 | [ ] Partial | Spreadsheet-ready output | A local first version previews labeled values and copies one tab-separated data row, with an option to include headers. Per-character customization and standalone layout backups remain open. See the scoped checklist below. |

### #13 Spreadsheet output scope

- [x] **Default row:** Show labeled values and copy values only, in this order from the pictured sheet: Activity, Date, Character, Description, Status, Level, DC Mod (rarity, etc.), DC, Assured?, Roll Result, Client. A separate copy option includes column titles. The first version uses the attempt completion date, the Crafting result for Status, item name and quantity for Description, and None or the entered Client. Confirm these mappings against the actual sheet before publication.
- [ ] **Limited customization:** Offer only supported output columns. Let the user turn columns on or off and change their order; no arbitrary formulas, custom code, or free-form column definitions. Keep a reset-to-default option.
- [ ] **Per-character settings:** Remember each character's column selection and order in this browser. Decide how settings follow a character rename or deletion when designing storage.
- [ ] **Standalone layout backup:** Export and import the column configuration by itself, separately from saved characters and crafting projects. Validate imported column IDs and order, ignore unknown fields, and confirm before replacing an existing layout.
- [ ] **Safe paste:** Tabs and line breaks are flattened and formula-like text is prefixed before copying. Unit checks pass; actual paste into Excel and Google Sheets on a phone and desktop remains to be tested.

## Suggested order

Start with **#13 spreadsheet-ready output** if moving results into a sheet is the immediate need; it can be the first choice under **#8 output formats**. **#3 target date** is a contained follow-up. **#6 formula book** is useful for regular crafters but needs a separate design. Keep **#2 target cost** and **#4 history** deferred unless the owner's use changes.

The builder intentionally permits flexible item combinations. New features should calculate and explain their chosen values without turning the app into a rules-enforcement tool.
