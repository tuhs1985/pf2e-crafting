# PF2e Crafting Calculator

A mobile-friendly builder for Pathfinder 2e crafting projects. It calculates costs, downtime, and results, then generates a formatted summary for Discord or a VTT. Custom costs and items are welcome; it does not enforce every equipment rule.

**Version 2.0 in development:** The upgrade feature is implemented locally and will appear on the live site after the next deployment.

**Live App:** [https://crafting.tuhsrpg.com](https://crafting.tuhsrpg.com)

See the [feature backlog](FEATURE-BACKLOG.md) for completed, deferred, and possible future additions.

## Features

- ✅ **5,874 Item Database** - Autocomplete from a pinned Foundry PF2e release, with published handwrap rune combinations supplied by the importer
- ✅ **Automatic Calculations** - DC, setup days, end dates, and cost reductions
- ✅ **Batch Crafting** - Craft up to 24 consumables/ammo at once
- ✅ **Cost Modifiers** - Support for percentage discounts/markups or flat adjustments
- ✅ **Precious Materials** - Material and grade selectors for weapons, armor, and shields, with automatic price, level, rarity, and minimum material value
- ✅ **Magic Weapons and Armor** - Fundamental-rune presets for eligible base equipment
- ✅ **Upgrades (v2.0)** - Craft the difference between recognized permanent item versions, including Handwraps of Mighty Blows
- ✅ **Character Saves** - Save, load, delete, export, and import name, level, and proficiency in your browser
- ✅ **Crafting Fee** - Add the order's downtime savings or set your own fee
- ✅ **Formula Options** - Buy formulas or work an extra day if you don't own one
- ✅ **Assurance Support** - Calculate with Assurance or manual roll values
- ✅ **Earn Income Integration** - Live cost and days-to-minimum estimate based on character level and proficiency
- ✅ **Copy to Clipboard** - One-click formatted output for Discord/Roll20/Foundry
- ✅ **PWA Enabled** - Install as an app for offline use
- ✅ **Mobile Optimized** - Touch-friendly interface with responsive design

## Quick Start

### Using the Hosted Version

Just visit [https://crafting.tuhsrpg.com](https://crafting.tuhsrpg.com) - no installation needed!

### Running Locally

```bash
# Clone the repository
git clone https://github.com/tuhs1985/pf2e-crafting.git
cd pf2e-crafting

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:5173
```

### Usage

1. **Enter character details** - Name, level, and crafting proficiency rank
2. **Search for item** - Type to autocomplete from the equipment database (or enter a custom item)
3. **Set quantity** - Craft 1-24 items (consumables/ammo only for batches)
4. **Choose formula option** - Own it, buy it, or work an extra day
5. **Set dates** - Start date and additional downtime days for cost reduction
6. **Roll or use Assurance** - Enter your crafting check result
7. **Click Generate** - Formatted summary auto-copies to clipboard!

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on source files
- `npm run deploy` - Deploy to GitHub Pages
- `npm run update:pf2e` - Update the upstream submodule to the latest stable PF2e release and rebuild equipment data
- `npm run import:pf2e` - Rebuild equipment data from the currently pinned PF2e release
- `node build-items-db.cjs` - Regenerate compressed item database
- `node build-materials-db.cjs` - Regenerate weapon/armor material data from the bundled source snapshot
- `node --test tests/*.test.cjs` - Run calculation and importer checks

See [plain-language update and publishing directions](UPDATING-PF2E.md) and [database details](data/README.md).

### Item Upgrades (v2.0)

Choose a recognized permanent target item, check **Upgrade**, and select the version you own. The builder uses the difference between the two listed prices as the crafting price. Cost Mod and downtime then apply; the target item's level and DC remain in effect. The generated summary names both versions. Consumables are excluded. Handwraps of Mighty Blows include the typical rune combinations listed in GM Core even though the Foundry equipment pack contains only the base entry.

### Character Saves and Crafting Fees

Save stores only character name, level, and proficiency in this browser. A matching name overwrites after confirmation; a new name creates a new save. Export a backup before clearing browser data, and Import it to restore saves. Item and crafting settings are not saved.

The optional crafting fee defaults to the order's actual downtime savings, or you can enter a fee manually. It appears separately from crafting cost in the output.

### Precious Materials

Material customization excludes named specific items and magical or rune-bearing
equipment, preserving their listed prices. Ordinary nonmagical weapons, armor,
and shields remain customizable, including those already made of precious material.

Select a weapon, armor, or shield and enable **Precious material**, then choose material
and grade. The calculated price replaces the ordinary item price; unchecking
restores the original fields. For custom items, use `weapon`, `armor`, or `shield` as the
Item Category. Ammunition is not supported yet.

The summary shows the precious material included in the cost, for example:
`Cost: 44 gp (includes at least 2.2 gp of silver)`. Cost Mod and additional
downtime change the total price but do not reduce that published minimum.
Quantity scales both amounts. Material options do not enforce proficiency,
character level, or build legality.

## Architecture

### Database Compression
The generated item database is roughly 463 KB in the current build:
- Deduplicated lookup tables for rarities, categories, bulks, and costs
- Items stored as index arrays instead of objects
- Parallel upgrade links identify recognized earlier versions
- Single-character keys and no whitespace
- Decompressed once on app load

### Technology Stack
- **React** 19.1.0 - UI framework
- **TypeScript** 5.8.3 - Type-safe development
- **Vite** 6.3.5 - Build tool and dev server
- **ESLint** 9.25.0 - Code linting
- **PWA** enabled via `vite-plugin-pwa` for offline support

### Key Design Patterns
- Timezone-safe date handling with local date parsing
- Optimized state management with inline calculations
- Autocomplete with keyboard navigation support
- Formula cost and Earn Income tables from PF2e Core Rulebook

## Crafting Rules Implemented

### DC Calculation
- Base DC by item level (14 for level 0, up to 50 for level 25)
- +2 for uncommon, +5 for rare, +10 for unique
- Custom DC adjustments supported

### Cost Calculation
- 50% minimum cost (raw materials)
- Earn Income reductions for additional downtime days
- Batch crafting applies reduction to entire batch (not per item)
- Cost modifiers: `-20%` (discount), `50%` (markup), or flat `+5` gp

### Setup & Downtime
- 1 day setup (default)
- +1 day if crafting without a formula
- Additional days reduce cost via Earn Income table
- Critical success uses next level's Earn Income value

### Formula Options
- Own formula: No extra cost or time
- Buy formula: Adds cost (5 sp at level 0, 3500 gp at level 20)
- Work extra day: +1 setup day instead of buying

## Data Source

Equipment data comes from the Pathfinder 2e system for Foundry VTT, pinned as a Git submodule. The importer reads its equipment JSON and generates the compressed database. A small importer supplement adds the published Handwraps of Mighty Blows rune combinations that are not separate Foundry equipment entries. Run `npm run update:pf2e` to move to the latest stable PF2e release; review and publish the resulting changes as described in [UPDATING-PF2E.md](UPDATING-PF2E.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow existing code patterns (single responsibility functions)
- Maintain type safety (leverage TypeScript)
- Test date calculations across timezones
- Verify autocomplete and form interactions
- Update documentation for rule changes

## Known Limitations

1. **Equipment coverage**: The importer uses Foundry's equipment pack plus the documented handwrap supplement. Custom items can be entered manually.
2. **Upgrade paths**: Only clear permanent-item versions recognized by the importer are offered. An absent option can still be handled with Cost Mod.
3. **Browser saves**: Character saves stay on this device unless exported; clearing site data can erase them.
4. **Rules flexibility**: The builder does not enforce every build restriction. GM-specific DC changes can use the DC Adjustment field.

## License

MIT License - feel free to use, fork, modify, and distribute this project however you want. See [LICENSE](LICENSE) file for full details.

## Legal / Attribution

This project uses trademarks and/or copyrights owned by Paizo Inc., used under [Paizo's Community Use Policy](https://paizo.com/licenses/communityuse). We are expressly prohibited from charging you to use or access this content. This project is not published, endorsed, or specifically approved by Paizo. For more information about Paizo Inc. and Paizo products, visit [paizo.com](https://paizo.com).

## Acknowledgments

- **Paizo** for Pathfinder 2e and the Crafting rules
- **Foundry VTT** PF2e system for equipment data
- **GitHub Copilot and Codex** for AI-assisted development support

## Links

- [Live App](https://crafting.tuhsrpg.com) (GitHub Pages)
- [Report Issues](https://github.com/tuhs1985/pf2e-crafting/issues)
- [PF2e Tools Hub](https://tools.tuhsrpg.com)
- [Pathfinder 2e](https://paizo.com/pathfinder)

---

### Updating PF2e equipment

Run `npm run update:pf2e` to import the latest stable PF2e system release. See
[plain-language update and publishing directions](UPDATING-PF2E.md).
