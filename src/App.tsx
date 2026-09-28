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
  minimumCostEstimate,
  formatSummary,
  getCostModifierError,
  normalizeDiscordRollLink,
} from "./utils/crafting";
import itemsDbRaw from "./data/items.db.json";
import PopoverHelp from "./PopoverHelp";
import { formatSheetRow } from "./utils/sheetOutput";
import { defaultSheetLayout, formatLayoutRow, formatLayoutWithHeaders, parseSheetLayout,
  serializeSheetLayout, validateSheetLayout, isNumericSheetColumn, type SheetLayout } from "./utils/sheetLayout";
import { storageKey, profileKey, parseProfiles, serializeProfiles, validateSheetTemplates,
  type SheetTemplate } from "./utils/characterProfiles";
import "./App.css";
import { materialRows, materialKind, materialLabel, gradeLabels, findMaterial,
  parseCarriedBulk, applyMaterial } from "./utils/materials";

// Compressed database format
type CompressedDb = {
  v?: number;
  m?: [string, number, string | null, string | null, number, string | null, number?][];
  u?: number[][];
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
  upgradeFrom: number[];
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
  upgradeFrom: db.u?.[idx] ?? [],
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
  const [clientName, setClientName] = useState("");
  const [clientDiscordId, setClientDiscordId] = useState("");
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
  const [useUpgrade, setUseUpgrade] = useState(false);
  const [upgradeChoice, setUpgradeChoice] = useState(0);
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
  const [naturalRoll, setNaturalRoll] = useState<"" | "20" | "1">("");
  const [craftingDC, setCraftingDC] = useState<string>("");
  const [dcAdjustment, setDcAdjustment] = useState<string>("");
  const [craftingRoll, setCraftingRoll] = useState<string>("");
  const [discordRollLink, setDiscordRollLink] = useState("");
  const [output, setOutput] = useState("");
  const [sheetRow, setSheetRow] = useState("");
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>(defaultSheetLayout);
  const [sheetTemplates, setSheetTemplates] = useState<SheetTemplate[]>([
    { name: "Default", layout: defaultSheetLayout() },
  ]);
  const [activeSheetTemplate, setActiveSheetTemplate] = useState("Default");
  const [creatingSheetTemplate, setCreatingSheetTemplate] = useState(false);
  const [newSheetTemplateName, setNewSheetTemplateName] = useState("");
  const [editingSheetLayout, setEditingSheetLayout] = useState(false);
  const [layoutNotice, updateLayoutNotice] = useState("");
  const layoutNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setLayoutNotice(message: string) {
    if (layoutNoticeTimer.current !== null) clearTimeout(layoutNoticeTimer.current);
    layoutNoticeTimer.current = null;
    updateLayoutNotice(message);
  }
  useEffect(() => {
    if (!layoutNotice) return;
    const dismiss = () => {
      if (layoutNoticeTimer.current !== null) return;
      layoutNoticeTimer.current = setTimeout(() => {
        layoutNoticeTimer.current = null;
        updateLayoutNotice("");
      }, 0);
    };
    const events = ["click", "keyup", "input", "change", "scroll", "wheel", "touchmove"];
    for (const event of events) document.addEventListener(event, dismiss, { capture: true, passive: true });
    return () => {
      if (layoutNoticeTimer.current !== null) clearTimeout(layoutNoticeTimer.current);
      layoutNoticeTimer.current = null;
      for (const event of events) document.removeEventListener(event, dismiss, true);
    };
  }, [layoutNotice]);
  const layoutInput = useRef<HTMLInputElement>(null);
  const [outputMode, setOutputMode] = useState<"summary" | "sheet">("summary");
  const [copyNotice, setCopyNotice] = useState("");
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
    if (val !== itemName) { setUseMaterial(false); setUseMagic(false); setUseUpgrade(false); }
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
    setUseUpgrade(false);
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
  const upgradeOptions = (isBatchItem ? [] : magicEnabled
    ? magicOptions.slice(0, magicIndex).map(option => ({ name: `${itemName} (${option.label})`, cost: option.price }))
    : !materialEnabled && matchedItem && !matchedItem.consumable
      ? matchedItem.upgradeFrom.map(index => items[index]) : [])
    .sort((a, b) => b.cost - a.cost);
  const upgradeEnabled = useUpgrade && upgradeOptions.length > 0;
  const selectedPrior = upgradeOptions[upgradeChoice] ?? upgradeOptions[0];
  const targetCost = Number(effectiveCost);
  const upgradeCost = upgradeEnabled && selectedPrior && Number.isFinite(targetCost)
    ? Math.max(0, Number((targetCost - selectedPrior.cost).toFixed(8))) : null;
  const upgradeError = upgradeEnabled && (upgradeCost === null || upgradeCost <= 0)
    ? "The target price must be higher than the owned version's price." : "";


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
    clientName,
    clientDiscordId,
    discordRollLink: normalizeDiscordRollLink(discordRollLink) ?? "",
    itemName: magicResult?.name ?? itemName,
    itemLevel: Number(effectiveLevel),
    itemRarity: effectiveRarity,
    itemCategory,
    itemBulk,
    itemCost: upgradeCost ?? Number(effectiveCost),
    upgradeFrom: upgradeEnabled ? selectedPrior.name : undefined,
    quantity,
    hasFormula,
    formulaOption,
    startDate,
    characterLevel: Number(characterLevel),
    proficiency,
    useAssurance,
    naturalRoll: useAssurance ? "" : naturalRoll,
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

  let minimumEstimate: ReturnType<typeof minimumCostEstimate> = null;
  let currentOrderCost = 0;
  let automaticFee = 0;
  try {
    if (effectiveCost !== "" && characterLevel !== "" && (useAssurance || craftingRoll !== "") && !materialError) {
      minimumEstimate = minimumCostEstimate(craftingInput,
        getResultType(craftingInput.craftingDC, craftingInput.craftingRoll, craftingInput.naturalRoll));
    }
    const orderCosts = calculateOrderCosts(craftingInput,
      getResultType(craftingInput.craftingDC, craftingInput.craftingRoll, craftingInput.naturalRoll));
    automaticFee = orderCosts.totalReduction / 100;
    currentOrderCost = orderCosts.finalCost;
  } catch { /* Cost Mod errors are reported on Generate. */ }
  const feeError = addCraftingFee && feeOverride.trim() !== "" &&
    (!Number.isFinite(Number(feeOverride)) || Number(feeOverride) < 0)
    ? "Enter a nonnegative crafting fee in gp." : "";
  const clientIdError = clientDiscordId.trim() && !/^\d+$/.test(clientDiscordId.trim())
    ? "Enter the Discord user ID as digits only." : "";
  const rollLinkError = discordRollLink.trim() && !normalizeDiscordRollLink(discordRollLink)
    ? "Enter a Discord message link." : "";

  // Calculate result and summary
  const handleGenerate = () => {
    if (modifierNoticeTimer.current !== null) clearTimeout(modifierNoticeTimer.current);
    const costModifierError = materialError || upgradeError || getCostModifierError(costModifier) || feeError || clientIdError || rollLinkError;
    if (costModifierError) {
      setCopyNotice("");
      setModifierNotice(costModifierError);
      modifierNoticeTimer.current = setTimeout(() => setModifierNotice(""), 5000);
      return;
    }
    setModifierNotice("");
    const resultType = getResultType(
      craftingInput.craftingDC,
      craftingInput.craftingRoll,
      craftingInput.naturalRoll
    );
    const endDate = calculateEndDate(
      craftingInput.startDate,
      craftingInput.setupDays,
      craftingInput.additionalDays
    );
    const summary = formatSummary(craftingInput, resultType, endDate);
    setOutput(summary);
    setSheetRow(formatSheetRow(craftingInput, resultType, endDate));
    setOutputMode("summary");
    navigator.clipboard.writeText(summary).then(() => {
      setCopyNotice("Summary copied to clipboard!");
      setTimeout(() => setCopyNotice(""), 2000);
    });
  };

  const copySelectedOutput = () => {
    const selected = outputMode === "sheet" ? formatLayoutRow(sheetRow, sheetLayout) : output;
    if (!selected) return;
    navigator.clipboard.writeText(selected).then(() => {
      setCopyNotice(outputMode === "sheet" ? "Sheet row copied to clipboard!" : "Summary copied to clipboard!");
      setTimeout(() => setCopyNotice(""), 2000);
    });
  };

  const copySheetWithHeaders = () => {
    if (!sheetRow) return;
    navigator.clipboard.writeText(formatLayoutWithHeaders(sheetRow, sheetLayout)).then(() => {
      setCopyNotice("Sheet headers and row copied!");
      setTimeout(() => setCopyNotice(""), 2000);
    });
  };

  const updateSheetColumn = (id: SheetLayout[number]["id"], change: Partial<SheetLayout[number]>) => {
    setLayoutNotice("");
    setSheetLayout(current => current.map(column => column.id === id ? { ...column, ...change } : column));
  };
  const moveSheetColumn = (index: number, direction: -1 | 1) => {
    const next = [...sheetLayout];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setLayoutNotice("");
    setSheetLayout(next);
  };
  const addBlankColumn = () => {
    const ids = sheetLayout.filter(column => typeof column.id === "string");
    if (ids.length >= 20) { setLayoutNotice("A layout can have up to 20 blank columns."); return; }
    const nextId = Math.max(0, ...ids.map(column => Number(String(column.id).slice(6)))) + 1;
    setSheetLayout([...sheetLayout, { id: `blank-${nextId}`, label: "", enabled: true }]);
    setLayoutNotice("");
  };
  const removeBlankColumn = (id: string) => {
    setSheetLayout(sheetLayout.filter(column => column.id !== id));
    setLayoutNotice("");
  };
  const selectSheetTemplate = (name: string) => {
    const current = sheetTemplates.find(template => template.name === activeSheetTemplate);
    const next = sheetTemplates.find(template => template.name === name);
    if (!next) return;
    if (current && JSON.stringify(sheetLayout) !== JSON.stringify(current.layout) &&
      !window.confirm("Discard unsaved changes to this sheet template?")) return;
    setLayoutNotice("");
    try {
      const text = localStorage.getItem(storageKey);
      const profiles = text ? parseProfiles(text) : [];
      const index = profiles.findIndex(profile => profileKey(profile.name) === profileKey(character));
      if (index >= 0 && profiles[index].sheetTemplates?.some(template => template.name === name)) {
        profiles[index] = { ...profiles[index], activeSheetTemplate: name, sheetLayout: next.layout };
        localStorage.setItem(storageKey, serializeProfiles(profiles));
      }
    } catch (error) {
      setLayoutNotice(error instanceof Error ? error.message : "Could not remember the selected template.");
    }
    setActiveSheetTemplate(name);
    setSheetLayout(next.layout);
  };
  const deleteSheetTemplate = () => {
    if (activeSheetTemplate === "Default" ||
      !window.confirm(`Delete the ${activeSheetTemplate} sheet template?`)) return;
    try {
      const remaining = validateSheetTemplates(sheetTemplates.filter(template => template.name !== activeSheetTemplate));
      const fallback = remaining.find(template => template.name === "Default")!;
      const text = localStorage.getItem(storageKey);
      const profiles = text ? parseProfiles(text) : [];
      const index = profiles.findIndex(profile => profileKey(profile.name) === profileKey(character));
      if (index >= 0) {
        profiles[index] = { ...profiles[index], sheetLayout: fallback.layout,
          sheetTemplates: remaining, activeSheetTemplate: "Default" };
        localStorage.setItem(storageKey, serializeProfiles(profiles));
      }
      setSheetTemplates(remaining);
      setActiveSheetTemplate("Default");
      setSheetLayout(fallback.layout);
      setLayoutNotice("Sheet template deleted.");
    } catch (error) { setLayoutNotice(error instanceof Error ? error.message : "Could not delete template."); }
  };
  const saveSheetLayout = () => {
    try {
      const text = localStorage.getItem(storageKey);
      const profiles = text ? parseProfiles(text) : [];
      const key = profileKey(character);
      const index = profiles.findIndex(profile => profileKey(profile.name) === key);
      if (!key || index < 0) throw new Error("Save this character first, then save the sheet layout.");
      const layout = validateSheetLayout(sheetLayout);
      const templateName = creatingSheetTemplate ? newSheetTemplateName.trim() : activeSheetTemplate;
      if (creatingSheetTemplate && sheetTemplates.some(template => profileKey(template.name) === profileKey(templateName))) {
        throw new Error("That template name is already in use.");
      }
      const templates = validateSheetTemplates(creatingSheetTemplate
        ? [...sheetTemplates, { name: templateName, layout }]
        : sheetTemplates.map(template => template.name === templateName ? { ...template, layout } : template));
      profiles[index] = { ...profiles[index], sheetLayout: layout,
        sheetTemplates: templates, activeSheetTemplate: templateName };
      localStorage.setItem(storageKey, serializeProfiles(profiles));
      setSheetTemplates(templates);
      setActiveSheetTemplate(templateName);
      setCreatingSheetTemplate(false);
      setNewSheetTemplateName("");
      setLayoutNotice(`${templateName} template saved for ${profiles[index].name}.`);
    } catch (error) { setLayoutNotice(error instanceof Error ? error.message : "Could not save layout."); }
  };
  const exportSheetLayout = () => {
    try {
      const url = URL.createObjectURL(new Blob([serializeSheetLayout(sheetLayout)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "pf2e-sheet-layout.json";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setLayoutNotice("Sheet layout download requested.");
    } catch (error) { setLayoutNotice(error instanceof Error ? error.message : "Could not export layout."); }
  };
  const importSheetLayout = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("This layout file is too large.");
      setSheetLayout(parseSheetLayout(await file.text()));
      setEditingSheetLayout(true);
      setLayoutNotice("Sheet layout imported. Save it to your character if you want to keep it.");
    } catch (error) { setLayoutNotice(error instanceof Error ? error.message : "Could not import layout."); }
    finally { if (layoutInput.current) layoutInput.current.value = ""; }
  };
  const sheetPreviewCells = formatLayoutRow(sheetRow, sheetLayout).split("\t");

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
                <li><strong>Upgrades:</strong> Select a non-consumable target item with a recognized lower version,
                  check Upgrade, and select the version you own. The crafting price is
                  the difference between their listed prices. Cost Mod applies afterward; the target item's
                  level and DC still apply. Uncheck Upgrade to craft the target at full price.
                </li>
                <li><strong>Crafting fee:</strong> Check Add crafting fee to charge for your work.
                  Leave Fee blank to use the order's actual downtime savings (up to the existing half-price cap).
                  Enter an amount, including zero, to override it; clear the field to restore automatic pricing.
                  The fee is added once per order. Failed attempts have no automatic fee, but you can enter one.
                  Cost remains your expense; Total charged includes the fee.
                </li>
                <li><strong>Saved characters:</strong> Save stores only your character name, level, and proficiency in this browser on this device.
                  Load selects a saved character; Delete removes a save after confirmation.
                  Save creates a separate character for a new name, or replaces a matching name after confirmation.
                  Clearing browser/site data can erase saves. Export downloads all saved characters as a backup file;
                  Import restores that file and asks before replacing matching names. Saved sheet layouts are included;
                  item and crafting settings are not saved.
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
                <li><strong>Sheet row:</strong> After generating, switch to Sheet row to see each column and its value.
                  Copy one row for an existing sheet, or copy with headers to start a new one. Edit columns to rename,
                  hide, or reorder them, or add blank columns. Cost, crafting fee, and total charged are optional
                  numeric columns. Use Negative on a numeric column if your sheet needs its value subtracted.
                  Create named sheet templates for different destinations. Save layout stores the selected template
                  with the current saved character; Export layout downloads just the selected layout.
                </li>
                <li><strong>Client:</strong> Enter a name for the sheet row and an optional numeric Discord ID
                  for a mention in the activity line. If both are blank, the sheet row shows None.
                </li>
                <li><strong>Discord roll link:</strong> Paste the message link from your Discord roll to make
                  the Result clickable in the summary. It is hidden from the sheet unless you enable its column.
                </li>
                <li><strong>Natural roll:</strong> If the d20 itself was a 20 or 1, select it below the Crafting check.
                  It shifts the result one degree up or down. Leave it blank for other rolls; Assurance has no die roll.
                </li>
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
          <fieldset className="form-section">
            <legend>Character</legend>
          {/* Character name */}
          <label>
            Name
            <input
              type="text"
              value={character}
              onChange={e => setCharacter(e.target.value)}
              placeholder="Bob the Barbarian"
            />
          </label>

          <CharacterSaves name={character} level={characterLevel} proficiency={proficiency} sheetLayout={sheetLayout}
            sheetTemplates={sheetTemplates} activeSheetTemplate={activeSheetTemplate}
            onSave={profile => { setSheetTemplates(profile.sheetTemplates!); setLayoutNotice(""); }}
            onLoad={profile => {
              setCharacter(profile.name); setCharacterLevel(String(profile.level)); setProficiency(profile.proficiency);
              const templates = profile.sheetTemplates ?? [
                { name: "Default", layout: profile.sheetLayout ?? defaultSheetLayout() },
              ];
              const active = profile.activeSheetTemplate ?? "Default";
              setSheetTemplates(templates);
              setActiveSheetTemplate(active);
              setSheetLayout(templates.find(template => template.name === active)!.layout);
              setLayoutNotice("");
            }} />

          {/* Character level and proficiency, same line */}
          <div className="form-row">
            <label>
              Level
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

          </fieldset>
          <fieldset className="form-section">
            <legend>Item</legend>
          {/* Item name and level, same line */}
          <div className="form-row">
            <label style={{ position: "relative" }}>
              Name
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
			  Level
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
                setUseUpgrade(false);
                if (e.target.checked) { setUseMaterial(false); setMagicIndex(0); }
              }} />
            Magic {magicKind}{" "}
            <PopoverHelp>
              Choose a magic enhancement. Its listed price, level, and DC replace the base values.
            </PopoverHelp>
          </label>}
          {showMaterialOption && <label>
            <input type="checkbox" checked={materialEnabled} disabled={!kind}
              onChange={e => {
                setUseMaterial(e.target.checked);
                if (e.target.checked) setUseUpgrade(false);
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
              Choose a material and grade to update cost, level, rarity, and DC.
            </PopoverHelp>
          </label>}
          </div>}
          {upgradeOptions.length > 0 && <div className="upgrade-heading">
            <label>
              <input type="checkbox" checked={upgradeEnabled}
                onChange={e => { setUseUpgrade(e.target.checked); setUpgradeChoice(0); }} />
              Upgrade{" "}
              <PopoverHelp>
                Choose your current version; craft the price difference.
              </PopoverHelp>
            </label>
            {upgradeEnabled && upgradeCost !== null &&
              <span className="upgrade-price">Upgrade crafting price: {upgradeCost.toLocaleString()} gp</span>}
          </div>}
          {upgradeEnabled && <div className="form-row">
            <select aria-label="Version to upgrade from" value={upgradeChoice}
              onChange={e => setUpgradeChoice(Number(e.target.value))}>
              {upgradeOptions.map((option, index) =>
                <option key={option.name} value={index}>{option.name} - saves {option.cost.toLocaleString()} gp</option>)}
            </select>
          </div>}
          {magicEnabled && <div className="form-row">
            <label>Magic enhancement
              <select value={magicIndex} onChange={e => { setMagicIndex(Number(e.target.value)); setUseUpgrade(false); }}>
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

          {/* Rarity, category, and bulk, same line */}
          <div className="form-row">
            <label style={{ position: "relative" }}>
              Rarity
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
              Category
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
				Base cost in gold pieces, per item.
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
				Adjust each item's cost. Try -25+10 or -20%. Details are in Instructions.
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

          </fieldset>
          <fieldset className="form-section">
            <legend>Crafting</legend>
          <div className="form-row client-row">
            <label>Client name <PopoverHelp>Leave both client fields empty for none.</PopoverHelp>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Name" />
            </label>
            <label>Discord ID
              <input type="text" inputMode="numeric" value={clientDiscordId}
                onChange={e => setClientDiscordId(e.target.value)} placeholder="User ID" />
            </label>
          </div>
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

          {/* Crafting check values */}
          <div className="form-row">
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
              DC Adj.
              <input
                type="number"
                aria-label="Custom DC Adjustment"
                value={dcAdjustment}
                onChange={e => setDcAdjustment(e.target.value)}
                placeholder="0"		
              />
            </label>
            <label>
              Roll
              <input
                type="number"
                aria-label="Crafting Roll Value"
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
          <div className="crafting-options-row">
            <label><input type="checkbox" checked={useAssurance}
              onChange={e => { setUseAssurance(e.target.checked); if (e.target.checked) setNaturalRoll(""); }} />
              Assurance
            </label>
            <label><input type="checkbox" checked={addCraftingFee}
              onChange={e => { setAddCraftingFee(e.target.checked); if (!e.target.checked) setFeeOverride(""); }} />
              + Crafting fee
            </label>
            <label className="natural-roll-control">Nat
              <select aria-label="Natural d20 roll" value={naturalRoll} disabled={useAssurance}
                onChange={e => setNaturalRoll(e.target.value as "" | "20" | "1")}>
                <option value="">—</option>
                <option value="20">20</option>
                <option value="1">1</option>
              </select>
            </label>
          </div>
          <label>Discord roll link <PopoverHelp>Paste a Discord message link. Leave blank to omit.</PopoverHelp>
            <input type="text" inputMode="url" value={discordRollLink}
              onChange={e => setDiscordRollLink(e.target.value)}
              placeholder="https://discord.com/channels/…" />
          </label>
          {minimumEstimate && <p className="minimum-cost-estimate">
            Current cost: {currentOrderCost} gp after {craftingInput.additionalDays} additional {craftingInput.additionalDays === 1 ? "day" : "days"}
            <br />
            Minimum cost: {minimumEstimate.cost} gp - {minimumEstimate.days} additional {minimumEstimate.days === 1 ? "day" : "days"}
          </p>}
          {addCraftingFee && <div className="form-row"><label>Fee (gp)
              <input type="number" min="0" step="any" value={feeOverride}
                placeholder={String(automaticFee)} aria-label="Crafting fee in gp"
                onChange={e => setFeeOverride(e.target.value)} />
            </label></div>}
          </fieldset>
          <button type="submit">Generate Summary</button>
        </form>

        {modifierNotice && (
          <div className="copied-toast" role="alert" style={{ width: "min(24rem, 80vw)", boxSizing: "border-box", overflowWrap: "anywhere" }}>
            {modifierNotice}
          </div>
        )}
        {copyNotice && !modifierNotice && (
          <div className="copied-toast">
            {copyNotice}
          </div>
        )}

        {output && (
          <div className="output-section">
            <div className="output-controls">
              <button type="button" aria-pressed={outputMode === "summary"}
                onClick={() => setOutputMode("summary")}>Summary</button>
              <button type="button" aria-pressed={outputMode === "sheet"}
                onClick={() => setOutputMode("sheet")}>Sheet row</button>
              {outputMode === "summary" && <button type="button" onClick={copySelectedOutput}>
                Copy summary
              </button>}
            </div>
            {outputMode === "summary" ? <pre className="output-pre">{output}</pre> : <>
              <div className="sheet-template-row">
                <label>Sheet template
                  <select value={activeSheetTemplate} onChange={e => selectSheetTemplate(e.target.value)}>
                    {sheetTemplates.map(template => <option key={template.name} value={template.name}>{template.name}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => { setCreatingSheetTemplate(true); setLayoutNotice(""); }}>New</button>
                <button type="button" disabled={activeSheetTemplate === "Default"} onClick={deleteSheetTemplate}>Delete</button>
              </div>
              {creatingSheetTemplate && <div className="sheet-template-new">
                <label>New template name
                  <input type="text" maxLength={50} value={newSheetTemplateName}
                    onChange={e => setNewSheetTemplateName(e.target.value)} placeholder="e.g. Living World" />
                </label>
                <button type="button" onClick={() => { setCreatingSheetTemplate(false); setNewSheetTemplateName(""); }}>Cancel</button>
              </div>}
              <div className="sheet-layout-actions">
                <button type="button" aria-expanded={editingSheetLayout}
                  onClick={() => setEditingSheetLayout(value => !value)}>
                  {editingSheetLayout ? "Done editing" : "Edit columns"}
                </button>
                {(editingSheetLayout || creatingSheetTemplate) &&
                  <button type="button" onClick={saveSheetLayout}>Save</button>}
                {editingSheetLayout && <>
                  <button type="button" onClick={() => { setSheetLayout(defaultSheetLayout()); setLayoutNotice(""); }}>Reset</button>
                  <button type="button" onClick={addBlankColumn}>Add blank column</button>
                </>}
                <button type="button" onClick={copySelectedOutput}>Copy sheet row</button>
                <button type="button" onClick={copySheetWithHeaders}>Copy with headers</button>
                {editingSheetLayout && <>
                  <button type="button" onClick={exportSheetLayout}>Export layout</button>
                  <button type="button" onClick={() => layoutInput.current?.click()}>Import layout</button>
                  <input ref={layoutInput} type="file" accept=".json,application/json" hidden
                    onChange={e => void importSheetLayout(e.target.files?.[0])} />
                </>}
              </div>
              {layoutNotice && <p className="sheet-layout-notice" role="status">{layoutNotice}</p>}
              {editingSheetLayout && <div className="sheet-layout-editor" aria-label="Edit sheet columns">
                {sheetLayout.map((column, index) => <div className="sheet-layout-column" key={column.id}>
                  <div className="sheet-layout-flags">
                    <label className="sheet-layout-toggle">
                      <input type="checkbox" checked={column.enabled}
                        disabled={column.enabled && sheetLayout.filter(c => c.enabled).length === 1}
                        onChange={e => updateSheetColumn(column.id, { enabled: e.target.checked })} />
                      Show
                    </label>
                    {isNumericSheetColumn(column.id) && <label className="sheet-layout-toggle">
                      <input type="checkbox" checked={!!column.negative}
                        onChange={e => updateSheetColumn(column.id, { negative: e.target.checked })} />
                      Negative
                    </label>}
                  </div>
                  {typeof column.id === "string"
                    ? <span className="sheet-layout-blank">Blank column (empty cell)</span>
                    : <label className="sheet-layout-name">Header
                        <input type="text" maxLength={60} value={column.label}
                          onChange={e => updateSheetColumn(column.id, { label: e.target.value })} />
                      </label>}
                  <div className="sheet-layout-move">
                    <button type="button" disabled={index === 0} aria-label={`Move ${column.label || "blank column"} up`}
                      onClick={() => moveSheetColumn(index, -1)}>↑</button>
                    <button type="button" disabled={index === sheetLayout.length - 1} aria-label={`Move ${column.label || "blank column"} down`}
                      onClick={() => moveSheetColumn(index, 1)}>↓</button>
                    {typeof column.id === "string" && <button type="button" aria-label="Remove blank column"
                      onClick={() => removeBlankColumn(column.id as string)}>×</button>}
                  </div>
                </div>)}
              </div>}
              <div className="sheet-preview" aria-label="Sheet row preview">
                {sheetLayout.filter(column => column.enabled).map((column, index) =>
                  <div className="sheet-preview-pair" key={column.id}>
                    <span className="sheet-preview-label">{column.label || "Blank column"}</span>
                    <span className="sheet-preview-value">{sheetPreviewCells[index]}</span>
                  </div>)}
              </div>
            </>}
          </div>
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
