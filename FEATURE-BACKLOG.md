# Feature backlog

This is a planning checklist, not a promise to implement every item. Status was checked against the deployed app and local source on September 27, 2026. Effort estimates are relative and should be revisited when a feature is selected.

| # | Status | Idea | Assessment / next decision |
|---|---|---|---|
| 1 | [x] Done | Days to minimum cost | Live current cost, minimum cost, and days to reach it are implemented and deployed. |
| 2 | [ ] Deferred | Target-cost mode | Reverse-calculating days is feasible (small effort), but the live cost changes as Additional Days changes. The owner preferred that simpler interaction and did not want target-cost mode for now. |
| 3 | [ ] Open | Target-date mode | Given a deadline, show affordable cost by that date. Small effort if it only derives days from the existing start date and calculation. Decide how past deadlines and setup days should read. |
| 4 | [ ] Deferred | Recent crafts / history | Low value for the owner's use: crafts are rarely repeated. Full-project restore would still be medium effort, so do not prioritize unless that need changes. |
| 5 | [ ] Open, low priority | Favorite items | Small to medium effort, but likely little benefit if items are not repeated often. Revisit only if recurring consumables become common. |
| 6 | [ ] Open | Formula book per character | Medium effort. Needs per-character ownership, item lookup, and a fallback when an upstream item is renamed or removed. |
| 7 | [ ] Open, low priority | Crafting project queue | Medium to large effort. Requires multiple projects and a clear model for ordering, dates, interruptions, and completion. Consider only if tracking several simultaneous crafts becomes useful. |
| 8 | [x] Done | Output format selector | The generated output switches between the normal summary and a spreadsheet row. The sheet view labels every value and can copy a data row or headers plus data. |
| 9 | [ ] Open | Item search filters | Small to medium effort. Current suggestions match name text; category and rarity do not filter them. Useful mainly when browsing rather than entering a known item. |
| 10 | [ ] Open | Property-rune builder | Medium to large effort, depending on scope. The app can stay flexible about legal combinations, but rune prices, names, capacity display, and interaction with magic presets and upgrades still need design. |
| 11 | [ ] Open | Precious-material ammunition | Medium effort, possibly more if the source data lacks a reliable purchase quantity or material-pricing basis. Batch costs need careful handling. |
| 12 | [ ] Partial | Crafting profitability view | The fee and total charged already exist. A separate profit or gp/day display is small effort mathematically, but first define whether “profit” means the fee alone and which days count. |
| 13 | [ ] Partial | Spreadsheet-ready output | The default row, labeled preview, column editing, per-character layouts, and standalone layout backups are implemented. Actual paste in Excel and Google Sheets remains to be checked. |

### #13 Spreadsheet output scope

- [x] **Default row:** Show labeled values and copy values only, in this order from the pictured sheet: Activity, Date, Character, Description, Status, Level, DC Mod (rarity, etc.), DC, Assured?, Roll Result, Client. A separate copy option includes column titles. The row uses the attempt completion date, the Crafting result for Status, item name and quantity for Description, and None or the entered Client name (Discord ID as fallback).
- [x] **Limited customization:** Edit supported columns by renaming headers, turning columns on or off, moving them up or down, and resetting to the pictured default. Discord roll link, Cost (after reduction), Crafting fee, and Total charged start hidden. No arbitrary formulas or user-defined data columns.
- [x] **Per-character settings:** Save a layout to an existing character profile and restore it on Load. Character backups now include layouts; older backups still import. Changing a character's name and saving creates a new profile, consistent with existing behavior.
- [x] **Standalone layout backup:** Export and import only the column configuration. Imported layouts change the preview first and require Save layout to attach to a character. Invalid files are rejected.
- [ ] **Safe paste:** Tabs and line breaks are flattened and formula-like text is prefixed before copying. Unit checks pass; actual paste into Excel and Google Sheets on a phone and desktop remains to be tested.
- [x] **Empty cells:** Add blank columns, move them into place, and remove them. Copied rows and headers preserve empty cells; the editor labels them for clarity.
- [x] **Money columns:** Cost (after reduction), Crafting fee, and Total charged are value-only optional columns, hidden by default. Cost matches the summary Cost line, including failure expenses; fee and total charged stay blank when the fee option is off.
- [ ] **Maybe — combined output cell:** Consider allowing one sheet cell to contain several selected output values. This may make layouts harder to edit and paste, so defer until there is a concrete sheet example that needs it.

## Suggested order

Verify a pasted row in Excel and Google Sheets when convenient. **#3 target date** is the next small, independent feature. **#6 formula book** is useful for regular crafters but needs a separate design. Keep **#2 target cost** and **#4 history** deferred unless the owner's use changes.

The builder intentionally permits flexible item combinations. New features should calculate and explain their chosen values without turning the app into a rules-enforcement tool.
