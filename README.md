# PF2e Crafting Calculator

A web-based tool for calculating crafting costs, time, and results for Pathfinder 2e crafting activities. Generate formatted summaries for Discord/VTT use with automatic calculations for Earn Income reductions, batch crafting, and formula costs.

**Live App:** [https://crafting.tuhsrpg.com](https://crafting.tuhsrpg.com)

## Features

- ✅ **5,566+ Item Database** - Autocomplete from Pathfinder 2e equipment with name/cost/level/rarity
- ✅ **Automatic Calculations** - DC, setup days, end dates, and cost reductions
- ✅ **Batch Crafting** - Craft up to 24 consumables/ammo at once
- ✅ **Cost Modifiers** - Support for percentage discounts/markups or flat adjustments
- ✅ **Formula Options** - Buy formulas or work an extra day if you don't own one
- ✅ **Assurance Support** - Calculate with Assurance or manual roll values
- ✅ **Earn Income Integration** - Automatic cost reduction based on character level and proficiency
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
2. **Search for item** - Type to autocomplete from 5,566+ items (or enter custom)
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
- `node build-items-db.cjs` - Regenerate compressed item database

## Architecture

### Database Compression
The item database uses an ultra-compact format with **78.5% size reduction** (1000 KB → 215 KB):
- Deduplicated lookup tables for rarities, categories, bulks, and costs
- Items stored as index arrays instead of objects
- Single-character keys and no whitespace
- Decompressed once on app load for zero runtime impact

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

Equipment data sourced from the Pathfinder 2e system for Foundry VTT. The `build-items-db.cjs` script processes JSON files from `src/packs/equipment/` and generates the compressed database.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow existing code patterns (single responsibility functions)
- Maintain type safety (leverage TypeScript)
- Test date calculations across timezones
- Verify autocomplete and form interactions
- Update documentation for rule changes

## Known Limitations

1. **Item Database**: Only includes equipment from PF2e Foundry data packs. Custom items must be entered manually.
2. **Homebrew Rules**: The calculator uses strict Core Rulebook crafting rules. House rules require manual adjustments.
3. **Rarity DC**: Rarity adjustments follow standard rules; GM-specific adjustments use the DC Adjustment field.

## License

MIT License - feel free to use, fork, modify, and distribute this project however you want. See [LICENSE](LICENSE) file for full details.

## Legal / Attribution

This project uses trademarks and/or copyrights owned by Paizo Inc., used under [Paizo's Community Use Policy](https://paizo.com/licenses/communityuse). We are expressly prohibited from charging you to use or access this content. This project is not published, endorsed, or specifically approved by Paizo. For more information about Paizo Inc. and Paizo products, visit [paizo.com](https://paizo.com).

## Acknowledgments

- **Paizo** for Pathfinder 2e and the Crafting rules
- **Foundry VTT** PF2e system for equipment data
- **GitHub Copilot** for AI-assisted development support
- The TUHSRPG community for testing and feedback

## Links

- [Live App](https://crafting.tuhsrpg.com) (GitHub Pages)
- [Report Issues](https://github.com/tuhs1985/pf2e-crafting/issues)
- [PF2e Tools Hub](https://tools.tuhsrpg.com)
- [Pathfinder 2e](https://paizo.com/pathfinder)

---