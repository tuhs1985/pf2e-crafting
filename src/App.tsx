import CharacterSaves from "./CharacterSaves";
import { magicEquipmentKind, magicEquipmentOptions, applyMagicEquipment } from "./utils/magicEquipment";
import { useState, useRef, useEffect } from "react";
import type { Proficiency, CraftingInput } from "./utils/crafting";
import {
  getProficiencyBonus,
  getResultType,
  calculateCraftingDC,
  calculateEndDate,
  calculateSetupDays,
  calculateOrderCosts,
  formatSummary,
  getCostModifierError,
} from "./utils/crafting";
import itemsDbRaw from "./data/items.db.json";
import PopoverHelp from "./PopoverHelp";
import "./App.css";
import { materialRows, materialKind, materialLabel, gradeLabels, findMaterial,
  parseCarriedBulk, applyMaterial } from "./utils/materials";

// Compressed database format
type CompressedDb = {
  v?: number;
  m?: [string, number, string | null, string | null, number, string | null, number?][];
  r: string[];      // rarities lookup
  c: string[];      // categories lookup
  b: string[];      // bulks lookup
  p: number[];      // costs/prices lookup
  n: string[];      // item names
  i: number[][];    // item data: [rarityIdx, categoryIdx, bulkIdx, costIdx, consumable, level]
};

// Decompressed item type
type ItemDbEntry = {
  name: string;
  level: number;
  rarity: string;
  category: string;
  bulk: string;
  cost: number;
  consumable: boolean;
  itemType: string;
  carriedBulk: number | null;
  materialType: string | null;
  materialGrade: string | null;
  pricePer: number;
  baseItem: string | null;
  canCustomizeMaterial: boolean;
};

// Decompress the database once on module load
const db = itemsDbRaw as CompressedDb;
const items: ItemDbEntry[] = db.i.map((item, idx) => ({
  name: db.n[idx],
  level: item[5],
  rarity: db.r[item[0]],
  category: db.c[item[1]],
  bulk: db.b[item[2]],
  cost: db.p[item[3]],
  consumable: item[4] === 1,
  itemType: db.m?.[idx]?.[0] ?? "",
  carriedBulk: db.m?.[idx]?.[1] ?? null,
  materialType: db.m?.[idx]?.[2] ?? null,
  materialGrade: db.m?.[idx]?.[3] ?? null,
  pricePer: db.m?.[idx]?.[4] ?? 1,
  baseItem: db.m?.[idx]?.[5] ?? null,
  canCustomizeMaterial: db.m?.[idx]?.[6] === 1,
}));

// Add the possible rarities for autocomplete
const RARITIES = ["common", "uncommon", "rare", "unique"];

export function ReturnButton() {
  const [expanded, setExpanded] = useState(false);

  // Only used for touch devices
  const handleTouchEnd = (e: React.TouchEvent<HTMLAnchorElement>) => {
    if (!expanded) {
      e.preventDefault();
      setExpanded(true);
    }
    // If already expanded, allow navigation
  };

  return (
    <a
      href="https://tools.tuhsrpg.com/"
      className={`return-btn${expanded ? " expanded" : ""}`}
      onTouchEnd={handleTouchEnd}
    >
      <span className="dots">&#8942;</span>
      <span className="arrow">&larr;</span>
      <span className="return-text">Return</span>
    </a>
  );
}

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
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [addCraftingFee, setAddCraftingFee] = useState(false);
  const [feeOverride, setFeeOverride] = useState("");
  const [character, setCharacter] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemLevel, setItemLevel] = useState<string>("");
  const [itemRarity, setItemRarity] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemBulk, setItemBulk] = useState("");
  const [itemCost, setItemCost] = useState<string>("");
  const [costModifier, setCostModifier] = useState<string>("");
  const [useMaterial, setUseMaterial] = useState(false);
  const [useMagic, setUseMagic] = useState(false);
  const [magicIndex, setMagicIndex] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState("silver");
  const [selectedGrade, setSelectedGrade] = useState("low");
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
  const [modifierNotice, setModifierNotice] = useState("");
  const modifierNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (modifierNoticeTimer.current !== null) clearTimeout(modifierNoticeTimer.current);
  }, []);
  const [showInstructions, setShowInstructions] = useState(false);

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
    if (val !== itemName) { setUseMaterial(false); setUseMagic(false); }
    setItemName(val);
    const matches = getItemSuggestions(val, items as ItemDbEntry[]);
    setItemSuggestions(matches);
    setShowSuggestions(!!val && matches.length > 0);
    setActiveSuggestionIndex(-1);

    // If exact match, autofill; if not, clear autofill fields
    const exact = matches.find(i => i.name.toLowerCase() === val.toLowerCase());
    if (exact) {
      setItemLevel(String(exact.level));
      setItemRarity(exact.rarity);
      setItemCategory(exact.category);
      setItemBulk(exact.bulk);
      setItemCost(String(exact.cost));
    }
    // If not exact, don't autofill (let user edit fields)
  }

  function handleSuggestionClick(item: ItemDbEntry) {
    setUseMagic(false);
    setUseMaterial(false);
    setItemName(item.name);
    setItemLevel(String(item.level));
    setItemRarity(item.rarity);
    setItemCategory(item.category);
    setItemBulk(item.bulk);
    setItemCost(String(item.cost));
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

  const itemType = matchedItem?.itemType ?? itemCategory.trim().toLowerCase();
  const kind = materialKind(itemType, matchedItem?.baseItem, matchedItem?.canCustomizeMaterial ?? true);
  const showMaterialOption = kind !== null;
  const magicKind = magicEquipmentKind(itemType, matchedItem?.canCustomizeMaterial ?? true, matchedItem?.materialType);
  const magicOptions = magicKind ? magicEquipmentOptions[magicKind] : [];
  const magicOption = magicOptions[magicIndex] ?? magicOptions[0];
  const magicEnabled = useMagic && magicKind !== null && !!magicOption;
  const materialEnabled = useMaterial && kind !== null && !magicEnabled;
  const customized = materialEnabled || magicEnabled;
  const magicResult = magicEnabled ? applyMagicEquipment(magicOption, {
    name: itemName, level: Number(itemLevel), rarity: itemRarity,
  }) : null;
  const availableMaterials = [...new Set(materialRows.filter(row => row.kind === kind).map(row => row.material))];
  const availableGrades = materialRows.filter(row => row.kind === kind && row.material === selectedMaterial);
  const materialRow = kind ? findMaterial(kind, selectedMaterial, selectedGrade) : undefined;
  const carriedBulk = itemType === "shield" ? 0 : kind
    ? matchedItem && itemBulk === matchedItem.bulk && matchedItem.carriedBulk !== null
      ? matchedItem.carriedBulk : parseCarriedBulk(itemBulk, kind)
    : null;
  const materialError = materialEnabled
    ? !materialRow ? "Choose a material and grade with pricing data."
      : carriedBulk === null ? "Enter Bulk as a number, L, or a dash for material pricing." : ""
    : "";
  const materialResult = materialEnabled && materialRow && carriedBulk !== null
    ? applyMaterial(materialRow, { carriedBulk, price: Number(itemCost), level: Number(itemLevel),
      rarity: itemRarity, existingMaterial: matchedItem?.materialType, existingGrade: matchedItem?.materialGrade })
    : null;
  const effectiveLevel = magicResult?.level ?? materialResult?.level ?? itemLevel;
  const effectiveRarity = magicResult?.rarity ?? materialResult?.rarity ?? itemRarity;
  const effectiveCost = magicResult?.price ?? materialResult?.price ?? itemCost;


  // Auto-calculate DC if item fields change
  const autoDC =
    effectiveLevel !== "" && effectiveRarity !== ""
      ? calculateCraftingDC(Number(effectiveLevel), effectiveRarity, Number(dcAdjustment) || 0)
      : "";

  // Calculate setup days inline: 1 day default, +1 if no formula and working extra day
  const setupDays = calculateSetupDays({ hasFormula, formulaOption });

  // Setup days (auto, not user-editable)
  const craftingInput: CraftingInput = {
    character,
    itemName: magicResult?.name ?? itemName,
    itemLevel: Number(effectiveLevel),
    itemRarity: effectiveRarity,
    itemCategory,
    itemBulk,
    itemCost: Number(effectiveCost),
    quantity,
    hasFormula,
    formulaOption,
    startDate,
    characterLevel: Number(characterLevel),
    proficiency,
    useAssurance,
    craftingDC: craftingDC === "" ? Number(autoDC) : Number(craftingDC),
    dcAdjustment: Number(dcAdjustment) || 0,
    craftingRoll: useAssurance
      ? 10 + getProficiencyBonus(Number(characterLevel), proficiency)
      : Number(craftingRoll),
    setupDays,
    additionalDays: Number(additionalDays) || 0,
    costModifier: costModifier,
    craftingFee: addCraftingFee ? { overrideGp: feeOverride.trim() === "" ? undefined : Number(feeOverride) } : undefined,
    preciousMaterial: materialResult ? { name: materialLabel(selectedMaterial),
      grade: gradeLabels[selectedGrade], minimumGpPerItem: materialResult.minimum } : undefined,
  };

  let automaticFee = 0;
  try {
    automaticFee = calculateOrderCosts(craftingInput,
      getResultType(craftingInput.craftingDC, craftingInput.craftingRoll)).totalReduction / 100;
  } catch { /* Cost Mod errors are reported on Generate. */ }
  const feeError = addCraftingFee && feeOverride.trim() !== "" &&
    (!Number.isFinite(Number(feeOverride)) || Number(feeOverride) < 0)
    ? "Enter a nonnegative crafting fee in gp." : "";

  // Calculate result and summary
  const handleGenerate = () => {
    if (modifierNoticeTimer.current !== null) clearTimeout(modifierNoticeTimer.current);
    const costModifierError = materialError || getCostModifierError(costModifier) || feeError;
    if (costModifierError) {
      setCopied(false);
      setModifierNotice(costModifierError);
      modifierNoticeTimer.current = setTimeout(() => setModifierNotice(""), 5000);
      return;
    }
    setModifierNotice("");
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
		<div className="header-container" style={{ position: "relative" }}>
		  {!isStandalone && (
			<ReturnButton />
		  )}
		  <h1 style={{ textAlign: "center", margin: 0 }}>PF2e Crafting Generator</h1>
		</div>
        <div className="instructions-container">
          <button
            type="button"
            className="instructions-toggle"
            onClick={() => setShowInstructions((v) => !v)}
            aria-expanded={showInstructions}
            aria-controls="instructions-content"
          >
            {showInstructions ? "Hide Instructions" : "Show Instructions"}
          </button>
          {showInstructions && (
            <div className="instructions-content" id="instructions-content" style={{marginTop: "1em"}}>
              <h2>How to Use</h2>
              <ol>
                <li><strong>Crafting fee:</strong> Check Add crafting fee to charge for your work.
                  Leave Fee blank to use the order's actual downtime savings (up to the existing half-price cap).
                  Enter an amount, including zero, to override it; clear the field to restore automatic pricing.
                  The fee is added once per order. Cost remains your expense; Total charged includes the fee.
                </li>
                <li><strong>Saved characters:</strong> Save stores only your character name, level, and proficiency in this browser on this device.
                  Load selects a saved character; Delete removes a save after confirmation.
                  Save creates a separate character for a new name, or replaces a matching name after confirmation.
                  Clearing browser/site data can erase saves. Export downloads all saved characters as a backup file;
                  Import restores that file and asks before replacing matching names. Item and crafting settings are not saved.
                </li>
                <li>Fill in all the details for your crafting project.</li>
                <li>
                  <strong>Cost Modifier:</strong> Enter a GP adjustment per item: <code>5</code> adds 5 gp;
                  <code> -25+10</code> subtracts 15 gp; <code>(50-25+10)</code> adds 35 gp.
                  Arithmetic supports +, -, *, /, decimals, and parentheses. Multiplication and division happen before addition and subtraction.<br />
                  Or enter one percentage: <code>-20%</code> discounts 20%; <code>50%</code> or <code>+50%</code> adds 50%.
                  Do not mix percentages with arithmetic. The adjustment applies to each item before quantity and downtime reductions.
                </li>
                <li>Click "Generate Summary" to see the results and copy them to your clipboard.</li>
                <li>
                  <strong>Magic weapon or armor:</strong> Select an eligible base item, check the box, and choose an enhancement.
                  The listed magic price includes the base item. Level and automatic DC update; base rarity is retained.
                  The enhancement appears in the summary name. Uncheck to restore the original values.
                  Precious material and magic presets are mutually exclusive; existing precious-material, enchanted, and named specific items cannot use magic presets.
                  Custom items can use the weapon or armor category. These presets include only the listed fundamental runes.
                </li>
                <li>
                  <strong>Precious material:</strong> Select a nonmagical weapon, armor, or shield, then check the box and choose a material and grade.
                  Named specific items and enchanted items keep their listed prices and cannot be customized here.
                  Cost, level, rarity, and automatic DC update. Uncheck to restore the original item.
                  For a custom item, enter <code>weapon</code>, <code>armor</code>, or <code>shield</code> in Item Category.
                  Bulk is the normal item Bulk; armor pricing includes its extra carried Bulk.
                  Shield prices do not depend on Bulk. Known shields use their Foundry pricing group; custom shields use the ordinary shield table.
                  The parenthetical amount is the minimum precious material included in the total, not an extra charge.
                  Cost Mod and downtime change the total but not that minimum. There are no proficiency or build-legality checks.
                </li>
              </ol>
            </div>
          )}
        </div>
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

          <CharacterSaves name={character} level={characterLevel} proficiency={proficiency}
            onLoad={profile => {
              setCharacter(profile.name); setCharacterLevel(String(profile.level)); setProficiency(profile.proficiency);
            }} />

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
			  max={25}
			  value={effectiveLevel}
              readOnly={customized}
			  onChange={e => {
				const inputValue = e.target.value;
				// Allow empty/clearing, clamp between 0-25 otherwise
				if (inputValue === '') {
				  setItemLevel('');
				} else {
				  const val = Math.max(0, Math.min(Number(inputValue), 25));
				  setItemLevel(String(val));
				}
			  }}
			  onBlur={() => {
				// On blur, ensure we have a valid number >= 0
				if (itemLevel === '' || Number(itemLevel) < 0) {
				  setItemLevel('0');
				}
			  }}
			  placeholder="0"		
			/>
			</label>
          </div>

          {(magicKind || showMaterialOption) && <div className="item-options-row">
          {magicKind && <label>
            <input type="checkbox" checked={magicEnabled}
              onChange={e => {
                setUseMagic(e.target.checked);
                if (e.target.checked) { setUseMaterial(false); setMagicIndex(0); }
              }} />
            Magic {magicKind}{" "}
            <PopoverHelp>
              Choose a fundamental-rune preset for a standard-material weapon or armor.
              The preset price replaces the base price; Cost Mod and downtime still apply.
              Level and automatic DC update, and the base rarity is retained.
              This option and Precious material cannot be used together. Uncheck to restore the original item.
            </PopoverHelp>
          </label>}
          {showMaterialOption && <label>
            <input type="checkbox" checked={materialEnabled} disabled={!kind}
              onChange={e => {
                setUseMaterial(e.target.checked);
                if (e.target.checked) setUseMagic(false);
                if (e.target.checked && kind) {
                  const initial = findMaterial(kind, matchedItem?.materialType ?? "silver", matchedItem?.materialGrade ?? "low")
                    ?? materialRows.find(row => row.kind === kind)!;
                  setSelectedMaterial(initial.material);
                  setSelectedGrade(initial.grade);
                }
              }} />
            Precious material{" "}
            <PopoverHelp>
              Available for nonmagical weapons, armor, and shields, excluding named specific items.
              Choose the material and grade to calculate its price, level, rarity, and DC.
              The material price replaces the ordinary item price. Cost Mod still adjusts it.
              The minimum precious material is included in the total and stays fixed through discounts and downtime.
              Shield pricing uses its buckler, ordinary shield, or tower group without a Bulk surcharge.
              Only materials and grades with listed prices appear. Uncheck to restore your original values. Ammunition is not included yet.
            </PopoverHelp>
          </label>}
          </div>}
          {magicEnabled && <div className="form-row">
            <label>Magic enhancement
              <select value={magicIndex} onChange={e => setMagicIndex(Number(e.target.value))}>
                {magicOptions.map((option, index) => <option key={option.label} value={index}>
                  {option.label} — {option.price.toLocaleString()} gp
                </option>)}
              </select>
            </label>
          </div>}
          {materialEnabled && (
            <div className="form-row">
              <label>Material
                <select value={selectedMaterial} onChange={e => {
                  setSelectedMaterial(e.target.value);
                  const grades = materialRows.filter(row => row.kind === kind && row.material === e.target.value);
                  setSelectedGrade(grades.some(row => row.grade === selectedGrade) ? selectedGrade : grades[0].grade);
                }}>
                  {availableMaterials.map(material => <option key={material} value={material}>{materialLabel(material)}</option>)}
                </select>
              </label>
              <label>Grade
                <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                  {availableGrades.map(row => <option key={row.grade} value={row.grade}>{gradeLabels[row.grade]}</option>)}
                </select>
              </label>
            </div>
          )}

          {/* Item Rarity, Category, and Bulk, same line */}
          <div className="form-row">
            <label style={{ position: "relative" }}>
              Item Rarity
              <input
                type="text"
                value={effectiveRarity}
                readOnly={customized}
                onChange={e => handleRarityChange(e.target.value)}
                onFocus={e => {
                  if (customized) return;
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
                onChange={e => {
                  setItemCategory(e.target.value);
                  if (!matchedItem) { setUseMaterial(false); setUseMagic(false); }
                }}
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
              Cost {" "}
			  <PopoverHelp>
				Use the base gold cost per item.<br />
				<br /><em>Tap or click outside to close.</em>
			  </PopoverHelp>
              <input
                type="number"
                min={0}
                step={0.01}
                value={effectiveCost}
                readOnly={customized}
                onChange={e => setItemCost(e.target.value)}
                placeholder="0"		
              />
            </label>
			<label>
			  Cost Mod{" "}
			  <PopoverHelp>
                Add/subtract GP per item using a number or arithmetic: -25+10 subtracts 15 gp; (50-25+10) adds 35 gp.
                Use +, -, *, /, decimals, and parentheses. This adjusts the existing price, not the final price.<br />
                Alternatively, use one percentage: -20% discounts 20%; +50% or 50% adds 50%. Do not mix % with arithmetic.
                Applies before quantity and downtime reductions.<br />
				<br /><em>Tap or click outside to close.</em>
			  </PopoverHelp>
              <input
                type="text"
                value={costModifier}
                onChange={e => setCostModifier(e.target.value)}
                placeholder="-20% or -25+10"
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
                setFormulaOption(e.target.checked ? "" : "work");
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
          <div className="form-row crafting-fee-row">
            <label><input type="checkbox" checked={addCraftingFee}
              onChange={e => { setAddCraftingFee(e.target.checked); if (!e.target.checked) setFeeOverride(""); }} />
              Add crafting fee
              <PopoverHelp>
                Defaults to this order's actual downtime savings, capped by the existing half-price reduction.
                Enter a fee to override it, or clear the field to return to automatic.
                The fee is added once for the whole order after crafting costs, not per item.
                Failed attempts have no automatic fee; a manual fee still applies.
              </PopoverHelp>
            </label>
            {addCraftingFee && <label>Fee (gp)
              <input type="number" min="0" step="any" value={feeOverride}
                placeholder={String(automaticFee)} aria-label="Crafting fee in gp"
                onChange={e => setFeeOverride(e.target.value)} />
            </label>}
          </div>
          <button type="submit">Generate Summary</button>
        </form>

        {modifierNotice && (
          <div className="copied-toast" role="alert" style={{ width: "min(24rem, 80vw)", boxSizing: "border-box", overflowWrap: "anywhere" }}>
            {modifierNotice}
          </div>
        )}
        {copied && !modifierNotice && (
          <div className="copied-toast">
            Summary copied to clipboard!
          </div>
        )}

        {output && (
          <pre className="output-pre">{output}</pre>
        )}

          <footer className="footer">
          <a
            href="https://github.com/tuhs1985/pf2e-crafting"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub / Report Issues
          </a>
			          
          <p className="paizo-notice">
            This website uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community Use Policy (paizo.com/licenses/communityuse). 
            We are expressly prohibited from charging you to use or access this content. This website is not published, endorsed, or specifically approved by Paizo. 
            For more information about Paizo Inc. and Paizo products, visit{' '}
            <a 
              href="https://paizo.com/" 
              target="_blank"
              rel="noopener noreferrer"
            >
              paizo.com
            </a>.
          </p>
          </footer>
      </div>
    </div>
  );
}
