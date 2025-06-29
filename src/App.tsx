import { useState, useRef, useEffect } from "react";
import type { Proficiency, CraftingInput } from "./utils/crafting";
import {
  calculateSetupDays,
  getProficiencyBonus,
  getResultType,
  calculateCraftingDC,
  calculateEndDate,
  formatSummary,
} from "./utils/crafting";
import items from "./data/items.db.json";
import "./App.css";

// Add the possible rarities for autocomplete
const RARITIES = ["common", "uncommon", "rare", "unique"];

// Updated ItemDbEntry type to include consumable field
type ItemDbEntry = {
  name: string;
  level: number;
  rarity: string;
  category: string;
  bulk: string;
  cost: number;
  consumable: boolean;
};

// Detects if the app is running as an installed PWA (standalone)
function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
	const checkStandalone = () =>
	  window.matchMedia('(display-mode: standalone)').matches ||
	  window.matchMedia('(display-mode: fullscreen)').matches ||
	  // @ts-ignore
	  window.navigator.standalone === true;

    setIsStandalone(checkStandalone());

    // Listen for changes to display-mode (in case user adds to home screen while open)
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = () => setIsStandalone(checkStandalone());
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler);
      } else if (mq.removeListener) {
        mq.removeListener(handler);
      }
    };
  }, []);

  return isStandalone;
}

function getItemSuggestions(query: string, items: ItemDbEntry[]): ItemDbEntry[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  return items.filter(i => i.name.toLowerCase().includes(lower));
}

// Add a helper for rarity suggestions
function getRaritySuggestions(query: string): string[] {
  if (!query) return RARITIES;
  const lower = query.toLowerCase();
  return RARITIES.filter(r => r.startsWith(lower));
}

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function App() {
  const [character, setCharacter] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemLevel, setItemLevel] = useState<string>("");
  const [itemRarity, setItemRarity] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemBulk, setItemBulk] = useState("");
  const [itemCost, setItemCost] = useState<string>("");
  const [costModifier, setCostModifier] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [hasFormula, setHasFormula] = useState(true);
  const [formulaOption, setFormulaOption] = useState<"buy" | "work" | "">("");
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [additionalDays, setAdditionalDays] = useState<string>("");
  const [characterLevel, setCharacterLevel] = useState<string>("");
  const [proficiency, setProficiency] = useState<Proficiency>("trained");
  const [useAssurance, setUseAssurance] = useState(false);
  const [craftingDC, setCraftingDC] = useState<string>("");
  const [dcAdjustment, setDcAdjustment] = useState<string>("");
  const [craftingRoll, setCraftingRoll] = useState<string>("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  // Autocomplete state
  const [itemSuggestions, setItemSuggestions] = useState<ItemDbEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Rarity autocomplete state
  const [raritySuggestions, setRaritySuggestions] = useState<string[]>([]);
  const [showRaritySuggestions, setShowRaritySuggestions] = useState(false);
  const rarityRef = useRef<HTMLUListElement>(null);

  // PWA standalone detection
  const isStandalone = useIsStandalone();

  // Handle input for autocomplete/search
  function handleItemNameChange(val: string) {
    setItemName(val);
    const matches = getItemSuggestions(val, items as ItemDbEntry[]);
    setItemSuggestions(matches);
    setShowSuggestions(!!val && matches.length > 0);
    setActiveSuggestionIndex(-1);

    // If exact match, autofill; if not, clear autofill fields
    const exact = matches.find(i => i.name.toLowerCase() === val.toLowerCase());
    if (exact) {
      setItemLevel(exact.level);
      setItemRarity(exact.rarity);
      setItemCategory(exact.category);
      setItemBulk(exact.bulk);
      setItemCost(exact.cost);
    }
    // If not exact, don't autofill (let user edit fields)
  }

  function handleSuggestionClick(item: ItemDbEntry) {
    setItemName(item.name);
    setItemLevel(item.level);
    setItemRarity(item.rarity);
    setItemCategory(item.category);
    setItemBulk(item.bulk);
    setItemCost(item.cost);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  // Keyboard navigation for item suggestions
  function handleItemNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || itemSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex(i =>
        i < itemSuggestions.length - 1 ? i + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex(i =>
        i > 0 ? i - 1 : itemSuggestions.length - 1
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < itemSuggestions.length) {
        e.preventDefault();
        handleSuggestionClick(itemSuggestions[activeSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }

  // Rarity autocomplete handlers
  function handleRarityChange(val: string) {
    setItemRarity(val);
    const suggestions = getRaritySuggestions(val);
    setRaritySuggestions(suggestions);
    setShowRaritySuggestions(!!val && suggestions.length > 0);
  }

  function handleRaritySuggestionClick(rarity: string) {
    setItemRarity(rarity);
    setShowRaritySuggestions(false);
  }

  // Use consumable field for batch logic
  const matchedItem = items.find(
    (i: ItemDbEntry) => i.name.toLowerCase() === itemName.toLowerCase()
  );
  const isBatchItem =
    matchedItem?.consumable ||
    itemCategory.toLowerCase() === "consumable" ||
    itemCategory.toLowerCase() === "ammo";
  const maxBatch = isBatchItem ? 24 : 1;

  // Cost per item is itemCost + costModifier (never less than 0)
  const costPer =
    Math.max(
      0,
      Number(itemCost) + (costModifier === "" ? 0 : Number(costModifier))
    );

  // Auto-calculate DC if item fields change
  const autoDC =
    itemLevel !== "" && itemRarity !== ""
      ? calculateCraftingDC(Number(itemLevel), itemRarity, dcAdjustment)
      : "";

  // Setup days (auto, not user-editable)
  const craftingInput: CraftingInput = {
    character,
    itemName,
    itemLevel: Number(itemLevel),
    itemRarity,
    itemCategory,
    itemBulk,
    itemCost: Number(itemCost),
    quantity,
    hasFormula,
    formulaOption,
    startDate,
    characterLevel: Number(characterLevel),
    proficiency,
    useAssurance,
    craftingDC: Number(craftingDC) || Number(autoDC),
    dcAdjustment,
    craftingRoll: useAssurance
      ? 10 + getProficiencyBonus(Number(characterLevel), proficiency)
      : Number(craftingRoll),
    setupDays: calculateSetupDays({
      character,
      itemName,
      itemLevel: Number(itemLevel),
      itemRarity,
      itemCategory,
      itemBulk,
      itemCost: Number(itemCost),
      quantity,
      hasFormula,
      formulaOption,
      startDate,
      characterLevel: Number(characterLevel),
      proficiency,
      useAssurance,
      craftingDC: Number(craftingDC) || Number(autoDC),
      dcAdjustment,
      craftingRoll: Number(craftingRoll),
      setupDays: 1,
      additionalDays,
      customItemCost: undefined, // Not used anymore
      costModifier: costModifier === "" ? 0 : Number(costModifier),
    }),
    additionalDays,
    customItemCost: undefined, // Not used anymore
    costModifier: costModifier === "" ? 0 : Number(costModifier),
  };

  // Calculate result and summary
  const handleGenerate = () => {
    const resultType = getResultType(
      craftingInput.craftingDC,
      craftingInput.craftingRoll
    );
    const endDate = calculateEndDate(
      craftingInput.startDate,
      craftingInput.setupDays,
      craftingInput.additionalDays
    );
    const summary = formatSummary(craftingInput, resultType, endDate);
    setOutput(summary);
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Click-away for rarity suggestions
  function handleRarityBlur() {
    setTimeout(() => setShowRaritySuggestions(false), 120);
  }

  return (
    <div className="app-container">
      <div className="inner-container">
        {/* "Return to Hub" only shows if not in standalone PWA mode */}
        {!isStandalone && (
          <a
            href="https://tools.tuhsrpg.com/"
            className="return-btn"
          >
            &larr; Return to Hub
          </a>
        )}
        <h1>PF2e Crafting Generator</h1>
        <form
          className="form-card"
          onSubmit={e => {
            e.preventDefault();
            handleGenerate();
          }}
          autoComplete="off"
        >
          {/* Character Name */}
          <label>
            Character Name
            <input
              type="text"
              value={character}
              onChange={e => setCharacter(e.target.value)}
              placeholder="Bob the Barbarian"
            />
          </label>

          {/* Character Level and Proficiency, same line */}
          <div className="form-row">
            <label>
              Character Level
              <input
                type="number"
                min={1}
                value={characterLevel}
                onChange={e => setCharacterLevel(e.target.value)}
                placeholder="1"
              />
            </label>
            <label>
              Proficiency Rank
              <select
                value={proficiency}
                onChange={e => setProficiency(e.target.value as Proficiency)}
              >
                <option value="trained">Trained</option>
                <option value="expert">Expert</option>
                <option value="master">Master</option>
                <option value="legendary">Legendary</option>
              </select>
            </label>
          </div>

          {/* Item Name and Item Level, same line */}
          <div className="form-row">
            <label style={{ position: "relative" }}>
              Item Name
              <input
                type="text"
                value={itemName}
                onChange={e => handleItemNameChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                onFocus={e => {
                  if (itemSuggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={handleItemNameKeyDown}
                autoComplete="off"
              />
              {showSuggestions && (
                <ul className="autocomplete-suggestions" ref={suggestionsRef}>
                  {itemSuggestions.map((item, i) => (
                    <li
                      key={item.name}
                      onMouseDown={() => handleSuggestionClick(item)}
                      className={activeSuggestionIndex === i ? "active" : ""}
                      style={{
                        padding: "0.25rem 0.5rem",
                        cursor: "pointer",
                        background:
                          activeSuggestionIndex === i ? "#444" : undefined,
                        color:
                          activeSuggestionIndex === i ? "#fff" : undefined,
                      }}
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <label>
              Item Level
              <input
                type="number"
                min={0}
                value={itemLevel}
                onChange={e => setItemLevel(e.target.value)}
                placeholder="0"		
              />
            </label>
          </div>

          {/* Item Rarity, Category, and Bulk, same line */}
          <div className="form-row">
            <label style={{ position: "relative" }}>
              Item Rarity
              <input
                type="text"
                value={itemRarity}
                onChange={e => handleRarityChange(e.target.value)}
                onFocus={e => {
                  const suggestions = getRaritySuggestions(e.target.value);
                  setRaritySuggestions(suggestions);
                  setShowRaritySuggestions(true);
                }}
                onBlur={handleRarityBlur}
                autoComplete="off"
              />
              {showRaritySuggestions && (
                <ul className="autocomplete-suggestions" ref={rarityRef}>
                  {raritySuggestions.map(rarity => (
                    <li
                      key={rarity}
                      onMouseDown={() => handleRaritySuggestionClick(rarity)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <label>
              Item Category
              <input
                type="text"
                value={itemCategory}
                onChange={e => setItemCategory(e.target.value)}
              />
            </label>
            <label>
              Bulk
              <input
                type="text"
                value={itemBulk}
                onChange={e => setItemBulk(e.target.value)}
              />
            </label>
          </div>

          {/* Item Cost (per item), Cost Modifier, Qty */}
          <div className="form-row">
            <label>
              Cost (gp/item)
              <input
                type="number"
                min={0}
                step={0.01}
                value={itemCost}
                onChange={e => setItemCost(e.target.value)}
                placeholder="0"		
              />
            </label>
            <label>
              Cost Mod (gp)
              <input
                type="number"
                step={0.01}
                value={costModifier}
                onChange={e => setCostModifier(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Qty
              <input
                type="number"
                min={1}
                max={maxBatch}
                value={quantity}
                onChange={e =>
                  setQuantity(Math.max(1, Math.min(Number(e.target.value), maxBatch)))
                }
                style={{ width: "3.5em" }}
              />
            </label>
          </div>

          {/* Formula Checkbox and Options */}
          <label>
            <input
              type="checkbox"
              checked={hasFormula}
              onChange={e => {
                setHasFormula(e.target.checked);
                if (e.target.checked) {
                  setFormulaOption(""); // CLEAR formulaOption when regaining ownership!
                }
              }}
            />
            I own the formula
          </label>
          {!hasFormula && (
            <div>
              <label>
                <input
                  type="radio"
                  name="formulaOption"
                  value="buy"
                  checked={formulaOption === "buy"}
                  onChange={e => setFormulaOption("buy")}
                />
                Buy formula (add price to cost)
              </label>
              <label>
                <input
                  type="radio"
                  name="formulaOption"
                  value="work"
                  checked={formulaOption === "work"}
                  onChange={e => setFormulaOption("work")}
                />
                Work extra day (add 1 setup day)
              </label>
            </div>
          )}

          {/* Start Date, Setup Days, Add'l Downtime Days on same line */}
          <div className="form-row">
            <label>
              Start Date
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </label>
            <label>
              Setup Days
              <input
                type="number"
                value={craftingInput.setupDays}
                readOnly
              />
            </label>
            <label>
              Add'l Days
              <input
                type="number"
                min={0}
                value={additionalDays}
                onChange={e => setAdditionalDays(e.target.value)}
                placeholder="0"				
              />
            </label>
          </div>

          {/* Use Assurance, Crafting DC, Custom DC Adjustment, Crafting Roll on same line */}
          <div className="form-row">
            <label className="vertical-label">
              Use Assurance
              <input
                type="checkbox"
                checked={useAssurance}
                onChange={e => setUseAssurance(e.target.checked)}
              />
            </label>
            <label>
              Crafting DC
              <input
                type="number"
                min={0}
                value={craftingDC === "" ? autoDC : craftingDC}
                onChange={e => setCraftingDC(e.target.value)}
                placeholder="0"		
              />
            </label>
            <label>
              Custom DC Adjustment
              <input
                type="number"
                value={dcAdjustment}
                onChange={e => setDcAdjustment(e.target.value)}
                placeholder="0"		
              />
            </label>
            <label>
              Crafting Roll Value
              <input
                type="number"
                min={0}
                value={
                  useAssurance
                    ? 10 + getProficiencyBonus(Number(characterLevel), proficiency)
                    : craftingRoll
                }
                onChange={e => setCraftingRoll(e.target.value)}
                placeholder="0"		
                disabled={useAssurance}
              />
            </label>
          </div>
          <button type="submit">Generate Summary</button>
        </form>

        {copied && (
          <div className="copied-toast">
            Summary copied to clipboard!
          </div>
        )}

        {output && (
          <pre className="output-pre">{output}</pre>
        )}

        <footer>
          <a
            href="https://github.com/tuhs1985/pf2e-crafting"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub / Report Issues
          </a>
        </footer>
      </div>
    </div>
  );
}