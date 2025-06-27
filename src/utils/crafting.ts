// PF2e Crafting logic utilities

export type Proficiency = "trained" | "expert" | "master" | "legendary";
export type ResultType = "Critical Success" | "Success" | "Failure" | "Critical Failure";

export interface CraftingInput {
  character: string;
  itemName: string;
  itemLevel: number;
  itemRarity: string;
  itemCategory: string;
  itemBulk: string;
  itemCost: number;
  quantity: number;
  hasFormula: boolean;
  formulaOption: "buy" | "work" | "";
  startDate: string;
  characterLevel: number;
  proficiency: Proficiency;
  useAssurance: boolean;
  craftingDC: number;
  dcAdjustment: number;
  craftingRoll: number;
  setupDays: number;
  additionalDays: number;
  costModifier?: number;
}

// ---- Formula Cost Table ----
const FORMULA_COST_TABLE: { level: number; priceGp: number }[] = [
  { level: 0, priceGp: 0.5 },
  { level: 1, priceGp: 1 },
  { level: 2, priceGp: 2 },
  { level: 3, priceGp: 3 },
  { level: 4, priceGp: 5 },
  { level: 5, priceGp: 8 },
  { level: 6, priceGp: 13 },
  { level: 7, priceGp: 18 },
  { level: 8, priceGp: 25 },
  { level: 9, priceGp: 35 },
  { level: 10, priceGp: 50 },
  { level: 11, priceGp: 70 },
  { level: 12, priceGp: 100 },
  { level: 13, priceGp: 150 },
  { level: 14, priceGp: 225 },
  { level: 15, priceGp: 325 },
  { level: 16, priceGp: 500 },
  { level: 17, priceGp: 750 },
  { level: 18, priceGp: 1200 },
  { level: 19, priceGp: 2000 },
  { level: 20, priceGp: 3500 }
];

// Find the formula cost for a given item level
export function getFormulaCost(itemLevel: number): number {
  let lastPrice = FORMULA_COST_TABLE[0].priceGp;
  for (const row of FORMULA_COST_TABLE) {
    if (itemLevel >= row.level) {
      lastPrice = row.priceGp;
    } else {
      break;
    }
  }
  return lastPrice;
}

// ---- Earn Income Table (from Crafting rules) ----
type EarnIncomeRow = {
  level: number;
  dc: number;
  failed: string;
  trained: string;
  expert: string;
  master: string;
  legendary: string;
};

const EARN_INCOME_TABLE: EarnIncomeRow[] = [
  { level: 0, dc: 14, failed: "1 cp", trained: "5 cp", expert: "5 cp", master: "5 cp", legendary: "5 cp" },
  { level: 1, dc: 15, failed: "2 cp", trained: "2 sp", expert: "2 sp", master: "2 sp", legendary: "2 sp" },
  { level: 2, dc: 16, failed: "4 cp", trained: "3 sp", expert: "3 sp", master: "3 sp", legendary: "3 sp" },
  { level: 3, dc: 18, failed: "8 cp", trained: "5 sp", expert: "5 sp", master: "5 sp", legendary: "5 sp" },
  { level: 4, dc: 19, failed: "1 sp", trained: "7 sp", expert: "8 sp", master: "8 sp", legendary: "8 sp" },
  { level: 5, dc: 20, failed: "2 sp", trained: "9 sp", expert: "1 gp", master: "1 gp", legendary: "1 gp" },
  { level: 6, dc: 22, failed: "3 sp", trained: "1 gp, 5 sp", expert: "2 gp", master: "2 gp", legendary: "2 gp" },
  { level: 7, dc: 23, failed: "4 sp", trained: "2 gp", expert: "2 gp, 5 sp", master: "2 gp, 5 sp", legendary: "2 gp, 5 sp" },
  { level: 8, dc: 24, failed: "5 sp", trained: "2 gp, 5 sp", expert: "3 gp", master: "3 gp", legendary: "3 gp" },
  { level: 9, dc: 26, failed: "6 sp", trained: "3 gp", expert: "4 gp", master: "4 gp", legendary: "4 gp" },
  { level: 10, dc: 27, failed: "7 sp", trained: "4 gp", expert: "5 gp", master: "6 gp", legendary: "6 gp" },
  { level: 11, dc: 28, failed: "8 sp", trained: "5 gp", expert: "6 gp", master: "8 gp", legendary: "8 gp" },
  { level: 12, dc: 30, failed: "9 sp", trained: "6 gp", expert: "8 gp", master: "10 gp", legendary: "10 gp" },
  { level: 13, dc: 31, failed: "1 gp", trained: "7 gp", expert: "10 gp", master: "15 gp", legendary: "15 gp" },
  { level: 14, dc: 32, failed: "1 gp, 5 sp", trained: "8 gp", expert: "15 gp", master: "20 gp", legendary: "20 gp" },
  { level: 15, dc: 34, failed: "2 gp", trained: "10 gp", expert: "20 gp", master: "28 gp", legendary: "28 gp" },
  { level: 16, dc: 35, failed: "2 gp, 5 sp", trained: "13 gp", expert: "25 gp", master: "36 gp", legendary: "40 gp" },
  { level: 17, dc: 36, failed: "3 gp", trained: "15 gp", expert: "30 gp", master: "45 gp", legendary: "55 gp" },
  { level: 18, dc: 38, failed: "4 gp", trained: "20 gp", expert: "45 gp", master: "70 gp", legendary: "90 gp" },
  { level: 19, dc: 39, failed: "6 gp", trained: "30 gp", expert: "60 gp", master: "100 gp", legendary: "130 gp" },
  { level: 20, dc: 40, failed: "8 gp", trained: "40 gp", expert: "75 gp", master: "150 gp", legendary: "200 gp" },
  // Special row for level 20 critical success
  { level: 21, dc: 0, failed: "-", trained: "50 gp", expert: "90 gp", master: "175 gp", legendary: "300 gp" },
];

// Utility for coin conversion
function parseCoinString(coin: string): number {
  // Returns value in copper
  let total = 0;
  const parts = coin.split(",").map(s => s.trim());
  for (const part of parts) {
    if (part.endsWith("gp")) total += parseFloat(part) * 100;
    else if (part.endsWith("sp")) total += parseFloat(part) * 10;
    else if (part.endsWith("cp")) total += parseFloat(part);
  }
  return total;
}

export function formatCopperAsGold(cp: number): string {
  // Returns a string like "1 gp, 5 sp, 4 cp"
  if (cp < 0) return "0 cp";
  const gp = Math.floor(cp / 100);
  const sp = Math.floor((cp % 100) / 10);
  const c = cp % 10;
  const res = [];
  if (gp) res.push(`${gp} gp`);
  if (sp) res.push(`${sp} sp`);
  if (c) res.push(`${c} cp`);
  if (!res.length) return "0 cp";
  return res.join(", ");
}

// Get earn income value per day in copper
export function getEarnIncomeReduction(
  characterLevel: number,
  proficiency: Proficiency,
  resultType: ResultType
): number {
  // For "Critical Success", use row for characterLevel+1 (if available)
  // For "Success", use row for characterLevel
  // For "Failure" and "Critical Failure", reduction is 0
  if (resultType === "Failure" || resultType === "Critical Failure") return 0;

  let row: EarnIncomeRow | undefined;
  let col: keyof Omit<EarnIncomeRow, "level" | "dc" | "failed">;

  if (resultType === "Critical Success") {
    // Special case for characterLevel 20, must use the "level 21" row
    if (characterLevel === 20) {
      row = EARN_INCOME_TABLE.find(r => r.level === 21);
    } else {
      row = EARN_INCOME_TABLE.find(r => r.level === characterLevel + 1);
    }
  } else {
    row = EARN_INCOME_TABLE.find(r => r.level === characterLevel);
  }

  if (!row) return 0;
  // Map proficiency to column
  switch (proficiency) {
    case "trained": col = "trained"; break;
    case "expert": col = "expert"; break;
    case "master": col = "master"; break;
    case "legendary": col = "legendary"; break;
    default: col = "trained";
  }
  const valueStr = row[col];
  if (valueStr === "-" || !valueStr) return 0;
  return parseCoinString(valueStr);
}

export function calculateSetupDays(input: CraftingInput): number {
  // Default 1, +1 for extra day of setup with no formula
  let days = 1;
  if (!input.hasFormula && input.formulaOption === "work") days += 1;
  return days;
}

export function getProficiencyBonus(level: number, proficiency: Proficiency): number {
  switch (proficiency) {
    case "trained": return level + 2;
    case "expert": return level + 4;
    case "master": return level + 6;
    case "legendary": return level + 8;
    default: return 0;
  }
}

export function getResultType(dc: number, roll: number): ResultType {
  if (roll >= dc + 10) return "Critical Success";
  if (roll >= dc) return "Success";
  if (roll <= dc - 10) return "Critical Failure";
  return "Failure";
}

export function calculateCraftingDC(itemLevel: number, itemRarity: string, dcAdjustment: number): number {
  // Default: Common = 14 + itemLevel, Uncommon +2, Rare +5, Unique +10 (PF2e rules)
  let base = 14 + itemLevel;
  if (itemRarity.toLowerCase() === "uncommon") base += 2;
  if (itemRarity.toLowerCase() === "rare") base += 5;
  if (itemRarity.toLowerCase() === "unique") base += 10;
  return base + dcAdjustment;
}

// Helper to parse a local date from yyyy-mm-dd (prevents timezone errors)
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Helper to format a date as MM/dd
function formatMMDD(dateStr: string): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

// Use parseLocalDate for all date math to avoid timezone/UTC drift
export function calculateEndDate(startDate: string, setupDays: number, additionalDays: number): string {
  if (!startDate) return "";
  const totalDays = setupDays + additionalDays;
  const start = parseLocalDate(startDate);
  // Subtract 1 for inclusive counting
  start.setDate(start.getDate() + totalDays - 1);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

export function formatSummary(
  input: CraftingInput,
  resultType: string,
  endDate: string
): string {
  const activity = `Craft ${input.quantity} x ${input.itemName}`;
  // Use itemCost + costModifier, min 0 per item
  const costPer = Math.max(
    0,
    (input.itemCost ?? 0) + (input.costModifier ?? 0)
  );
  const baseCost = costPer * input.quantity;

  // Always pay at least 50% up front
  const minCostCopper = Math.floor(baseCost * 100 / 2);

  // Only reduce cost if there are additional downtime days and a successful result
  let reductionPerDay = 0;
  let totalReduction = 0;
  if (
    (resultType === "Success" || resultType === "Critical Success") &&
    input.additionalDays > 0
  ) {
    reductionPerDay = getEarnIncomeReduction(
      input.characterLevel, // FIXED: do not add +1 here
      input.proficiency,
      resultType as ResultType
    );
    const maxReduction = minCostCopper; // Max reduction is 50% of base cost
    totalReduction = Math.min(
      input.additionalDays * reductionPerDay, // batch reduction, NOT per item
      maxReduction
    );
  }

  // Final cost cannot go below 50%
  let finalCostCopper = baseCost * 100 - totalReduction;
  if (finalCostCopper < minCostCopper) finalCostCopper = minCostCopper;

  let formulaCost = 0;
  if (input.formulaOption === "buy") {
    formulaCost = getFormulaCost(input.itemLevel) * 100; // formula cost in copper
  }
  const totalFinalCopper = finalCostCopper + formulaCost;
  const finalCost = totalFinalCopper / 100;

  // Only show reduction if any
  const reductionStr =
    totalReduction > 0
      ? ` (reduced by ${totalReduction / 100} gp)`
      : "";

  let resultStr = resultType;
  if (input.useAssurance) resultStr = "Assurance " + resultStr;
  resultStr += ` (${input.craftingRoll})`;

  // Format days as MM/dd-MM/dd (show single date if same day)
  let daysStr = formatMMDD(input.startDate);
  const endMMDD = formatMMDD(endDate);
  if (endMMDD && endMMDD !== daysStr) {
    daysStr += `-${endMMDD}`;
  }

  // If buying formula, show as "(includes +X gp for formula)"
  let costLine = `**Cost:** ${finalCost} gp${reductionStr}`;
  if (formulaCost > 0) {
    costLine = `**Cost:** ${finalCost} gp (includes +${formulaCost/100} gp for formula)${reductionStr}`;
  }

  return (
    `**Character:** ${input.character}\n` +
    `**Activity:** ${activity}\n` +
    `**Days:** ${daysStr}\n` +
    `**Item Level:** ${input.itemLevel}\n` +
    `**DC:** ${input.craftingDC}\n` +
    `**Result:** ${resultStr}\n` +
    costLine + `\n`
  );
}