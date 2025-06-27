import { useState, useRef } from "react";
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

type ItemDbEntry = {
  name: string;
  level: number;
  rarity: string;
  category: string;
  bulk: string;
  cost: number;
};

function getItemSuggestions(query: string, items: ItemDbEntry[]): ItemDbEntry[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  return items.filter(i => i.name.toLowerCase().includes(lower));
}

export default function App() {
  const [character, setCharacter] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemLevel, setItemLevel] = useState<number | "">("");
  const [itemRarity, setItemRarity] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemBulk, setItemBulk] = useState("");
  const [itemCost, setItemCost] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [hasFormula, setHasFormula] = useState(true);
  const [formulaOption, setFormulaOption] = useState<"buy" | "work" | "">("");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [additionalDays, setAdditionalDays] = useState(0);
  const [characterLevel, setCharacterLevel] = useState<number | "">("");
  const [proficiency, setProficiency] = useState<Proficiency>("trained");
  const [useAssurance, setUseAssurance] = useState(false);
  const [craftingDC, setCraftingDC] = useState<number | "">("");
  const [dcAdjustment, setDcAdjustment] = useState(0);
  const [craftingRoll, setCraftingRoll] = useState<number | "">("");
  const [customItemCost, setCustomItemCost] = useState<number | "">("");
  const [output, setOutput] = useState("");

  // Autocomplete state
  const [itemSuggestions, setItemSuggestions] = useState<ItemDbEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // Handle input for autocomplete/search
  function handleItemNameChange(val: string) {
    setItemName(val);
    const matches = getItemSuggestions(val, items as ItemDbEntry[]);
    setItemSuggestions(matches);
    setShowSuggestions(!!val && matches.length > 0);

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

  // User selects suggestion
  function handleSuggestionClick(item: ItemDbEntry) {
    setItemName(item.name);
    setItemLevel(item.level);
    setItemRarity(item.rarity);
    setItemCategory(item.category);
    setItemBulk(item.bulk);
    setItemCost(item.cost);
    setShowSuggestions(false);
  }

  // Determine if batch item
  const isBatchItem = itemCategory === "consumable" || itemCategory === "ammo";
  const maxBatch = isBatchItem ? 4 : 1;

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
      customItemCost: customItemCost === "" ? undefined : Number(customItemCost),
    }),
    additionalDays,
    customItemCost: customItemCost === "" ? undefined : Number(customItemCost),
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
    setOutput(formatSummary(craftingInput, resultType, endDate));
  };

  return (
    <div className="app-container">
      <div className="inner-container">
        <h1>PF2e Crafting Generator</h1>
        <form
          className="form-card"
          onSubmit={e => {
            e.preventDefault();
            handleGenerate();
          }}
          autoComplete="off"
        >
          <label>
            Character Name
            <input
              type="text"
              value={character}
              onChange={e => setCharacter(e.target.value)}
              required
            />
          </label>
          {/* Autocomplete for Item Name */}
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
              required
              autoComplete="off"
            />
            {showSuggestions && (
              <ul
                className="autocomplete-suggestions"
                ref={suggestionsRef}
                style={{
                  position: "absolute",
                  zIndex: 10,
                  background: "#fff",
                  border: "1px solid #ddd",
                  width: "100%",
                  maxHeight: "120px",
                  overflowY: "auto",
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                }}
              >
                {itemSuggestions.map(item => (
                  <li
                    key={item.name}
                    onMouseDown={() => handleSuggestionClick(item)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      cursor: "pointer",
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
              onChange={e => setItemLevel(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Item Rarity
            <input
              type="text"
              value={itemRarity}
              onChange={e => setItemRarity(e.target.value)}
            />
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
          <label>
            Item Cost (per item)
            <input
              type="number"
              min={0}
              value={itemCost}
              onChange={e => setItemCost(Number(e.target.value))}
            />
          </label>
          <label>
            Quantity
            <input
              type="number"
              min={1}
              max={maxBatch}
              value={quantity}
              onChange={e =>
                setQuantity(Math.max(1, Math.min(Number(e.target.value), maxBatch)))
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={hasFormula}
              onChange={e => setHasFormula(e.target.checked)}
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
            Additional Downtime Days Used
            <input
              type="number"
              min={0}
              value={additionalDays}
              onChange={e => setAdditionalDays(Number(e.target.value))}
            />
          </label>
          <label>
            Character Level
            <input
              type="number"
              min={1}
              value={characterLevel}
              onChange={e => setCharacterLevel(Number(e.target.value))}
              required
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
          <label>
            <input
              type="checkbox"
              checked={useAssurance}
              onChange={e => setUseAssurance(e.target.checked)}
            />
            Use Assurance
          </label>
          <label>
            Crafting DC
            <input
              type="number"
              min={0}
              value={craftingDC === "" ? autoDC : craftingDC}
              onChange={e => setCraftingDC(Number(e.target.value))}
            />
          </label>
          <label>
            Custom DC Adjustment
            <input
              type="number"
              value={dcAdjustment}
              onChange={e => setDcAdjustment(Number(e.target.value))}
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
              onChange={e => setCraftingRoll(Number(e.target.value))}
              disabled={useAssurance}
            />
          </label>
          <label>
            Custom Item Cost
            <input
              type="number"
              min={0}
              value={customItemCost}
              onChange={e => setCustomItemCost(Number(e.target.value))}
            />
          </label>
          <button type="submit">Generate Summary</button>
        </form>
        {output && (
          <div className="output-card">
            <h2>Discord Summary</h2>
            <pre>{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}