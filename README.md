# PF2e Crafting Calculator

A mobile-friendly Pathfinder 2e crafting builder. Calculate costs, downtime, and outcomes, then copy a summary for Discord or a spreadsheet row for Excel and Google Sheets. Custom items and GM adjustments are supported; the app leaves build legality to your group.

**Version 2.0** · [Live app](https://crafting.tuhsrpg.com) · [Feature checklist](FEATURE-BACKLOG.md)

## Quick start

1. Enter or load a character's name, level, and proficiency.
2. Search for an item or enter one manually. Set quantity and any item customization.
3. Choose a formula option, start date, and additional work days.
4. Enter the total Crafting check or enable Assurance. Select Nat 20/1 only when applicable.
5. Choose **Generate Summary** to preview and copy the result. Switch to **Sheet row** for spreadsheet output.

The in-app Instructions contain expandable sections for each area below. The app can also be installed as a PWA for offline use.

## Characters and backups

**Save**, **Load**, **Delete**, **Export**, and **Import** manage characters in this browser on this device. Saves contain name, level, proficiency, and sheet templates. They do not contain the item or crafting project.

A new name creates a separate save. A matching name overwrites after confirmation. Export downloads all saved characters; Import validates the backup and asks before replacing matching names. Clearing browser data can erase saves, so keep an exported backup.

## Items and customization

The item search uses equipment imported from a pinned stable release of Foundry PF2e. Custom items can be entered manually. Consumables and ammunition allow quantities up to 24.

### Upgrades

Choose a recognized permanent target item, enable **Upgrade**, and select the version you own. The price becomes the difference between their listed prices; Cost Mod and downtime apply afterward. The target's level and DC remain in effect. The summary names both versions. Consumables are excluded.

The importer supplies the published Handwraps of Mighty Blows rune combinations that are not separate Foundry equipment entries.

### Magic weapons and armor

Eligible base weapons and armor offer fundamental-rune presets. The listed price includes the base item, and level and automatic DC update. These presets cannot be paired with precious-material customization. Named magical equipment keeps its listed price.

### Precious materials

Eligible nonmagical weapons, armor, and shields offer material and grade selectors. These update price, level, rarity, and automatic DC. Unchecking the option restores the base item. Named magical or rune-bearing equipment cannot use this customization; precious-material ammunition is not supported yet.

For custom equipment, use Category `weapon`, `armor`, or `shield`. Enter normal Bulk; armor pricing accounts for carried Bulk. Shields use their Foundry pricing group rather than Bulk; custom shields use the ordinary shield table.

The summary's material amount is included in the price, not added to it:
`Cost: 44 gp (includes at least 2.2 gp of silver)`.
Cost Mod and downtime do not reduce that published material minimum. Quantity scales both amounts.

## Crafting costs, downtime, and rolls

- **Formula:** Owning or buying one uses 1 setup day. Working an extra day uses 2 setup days. Buying adds the formula price.
- **Cost Mod:** Applies to each item before quantity and downtime. Enter a GP adjustment such as `5` or arithmetic such as `-25+10` and `(50-25+10)`. Operators are `+`, `-`, `*`, `/`; decimals and parentheses are supported. Multiplication and division happen first.
- **Percentages:** Use one percentage instead of arithmetic: `-20%` discounts 20%; `50%` or `+50%` adds 50%. Do not mix percentages with arithmetic.
- **Additional days:** Successful work reduces the whole order's cost using the Earn Income table, up to the half-price cap. Critical success uses the next level's table value. Live estimates show current cost, minimum cost, and total additional days needed to reach it.
- **+ Crafting fee:** A blank Fee uses actual downtime savings. Enter an amount, including zero, to override it. The fee applies once per order. Cost is the expense; Total charged adds the fee. Failed attempts have no automatic fee.
- **Assurance and Nat:** Enter the total check or use Assurance. Nat 20/1 shifts the outcome one degree; leave it blank for other rolls. Assurance has no natural roll.
- **Failure:** Only setup days are spent. Materials are recoverable; critical failure loses 10% of the initial half-price supply. Purchased formulas remain an expense.

DC is based on item level, with rarity and custom adjustments. Custom prices, DCs, and equipment combinations remain available for GM-approved situations.

### Clients and Discord roll links

Enter a client name for the sheet and an optional Discord user ID for a mention in the summary. If both are empty, the sheet uses `None`.

An optional Discord message link makes the summary's Result text clickable when pasted into Discord. It is not included in the default sheet layout.

## Spreadsheet output and templates

After generating, select **Sheet row** to preview labeled values. **Copy sheet row** copies one tab-separated data row. **Copy with headers** adds a header row above it. Paste into the first destination cell in Excel or Google Sheets.

The default columns are:
Activity, Date, Character, Description, Status, Level, DC Mod (rarity, etc.), DC, Assured?, Roll Result, Client.

### Customize columns

**Edit columns** lets you show/hide values, rename headers, and move columns with Up/Down buttons. **Add blank column** inserts an empty cell that can be moved or removed. Blank cells also have empty copied headers. **Reset** restores the original arrangement.

Discord roll link, Cost (after reduction), Crafting fee, and Total charged start hidden. Money values have no `gp` suffix; fee and total charged stay blank when the fee option is off. **Negative** changes the sign of a selected numeric sheet value without changing the crafting summary.

### Named templates

Each character can store up to ten templates for different sheets. Choose **New** to copy the current arrangement, enter a name, and use **Save** to create and store it. The same Save button stores edits to the selected template. Save the character first. Switching warns before discarding unsaved edits, and Default cannot be deleted.

Character backups include all templates and the active selection. Older single-layout saves load as Default. **Export layout** downloads the current layout alone; **Import layout** previews one for review before saving it to the character.

Imported files are validated as data. Text containing tabs/newlines is flattened for sheet cells, and formula-looking text is escaped before copying. Combined values in one cell are deferred; see the [feature checklist](FEATURE-BACKLOG.md).

## Development and equipment updates

### Run locally

```bash
git clone https://github.com/tuhs1985/pf2e-crafting.git
cd pf2e-crafting
npm install
npm run dev
```

Open the address shown by the development server. The generated database is included, so upstream equipment is only needed for rebuilding data.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development app |
| `npm run build` | Build production files |
| `npm run preview` | Preview the production build |
| `npm test` | Run calculation, backup, and importer checks |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build and publish to GitHub Pages |
| `npm run setup:pf2e` | Set up the pinned upstream checkout |
| `npm run update:pf2e` | Select the latest stable PF2e release and rebuild equipment data |
| `npm run import:pf2e` | Rebuild data from the pinned PF2e release |

Follow [plain-language update and publishing directions](UPDATING-PF2E.md). See [database details](data/README.md) for the importer and generated files.

### Architecture

React, TypeScript, Vite, and `vite-plugin-pwa` power the app. Equipment comes from the Foundry PF2e Git submodule. The importer creates a compressed database with deduplicated lookup tables, indexed item records, material metadata, and recognized upgrade links. It also generates the handwrap supplement.

Date calculations use local date parsing to avoid timezone shifts. Crafting calculations, sheet layouts, and character backups have dedicated utilities and tests. Match existing patterns, preserve old backups, and verify mobile controls when contributing.

## Known limitations

- Equipment coverage follows Foundry's equipment pack plus the importer supplement; missing items can be entered manually.
- Upgrade links cover clear permanent-item progressions recognized by the importer. Other changes can be handled with Cost Mod.
- Character saves and templates stay in this browser unless exported.
- The builder does not enforce every equipment or crafting restriction.

## License and attribution

[MIT License](LICENSE).

This project uses trademarks and/or copyrights owned by Paizo Inc., used under [Paizo's Community Use Policy](https://paizo.com/licenses/communityuse). We are expressly prohibited from charging you to use or access this content. This project is not published, endorsed, or specifically approved by Paizo. For more information about Paizo Inc. and Paizo products, visit [paizo.com](https://paizo.com).

Thanks to Paizo for Pathfinder 2e, Foundry VTT PF2e for equipment data, and GitHub Copilot and Codex for development assistance.

[Live app](https://crafting.tuhsrpg.com) · [Report an issue](https://github.com/tuhs1985/pf2e-crafting/issues) · [PF2e Tools Hub](https://tools.tuhsrpg.com)
