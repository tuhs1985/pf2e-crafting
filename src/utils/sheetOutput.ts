import { calculateEndDate, calculateOrderCosts, type CraftingInput, type ResultType } from "./crafting";
import { DEFAULT_SHEET_COLUMNS } from "./sheetLayout";

// Matches the supplied spreadsheet. The copied row contains values only.
export const SHEET_COLUMNS = DEFAULT_SHEET_COLUMNS;

function safeCell(value: string | number): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = value.replace(/[\t\r\n\u2028\u2029]+/g, " ").trim();
  // Spreadsheet apps evaluate text starting with these characters as formulas.
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function sheetCells(input: CraftingInput, result: ResultType, endDate: string): string[] {
  const failed = result === "Failure" || result === "Critical Failure";
  const date = failed ? calculateEndDate(input.startDate, input.setupDays, 0) : endDate;
  const dcParts = [
    input.itemRarity.toLowerCase() === "common" ? "" : input.itemRarity,
    input.dcAdjustment ? `Custom ${input.dcAdjustment > 0 ? "+" : ""}${input.dcAdjustment}` : "",
  ].filter(Boolean);
  const description = input.upgradeFrom
    ? `${input.quantity} x ${input.itemName} (from ${input.upgradeFrom})`
    : `${input.quantity} x ${input.itemName}`;
  const costs = calculateOrderCosts(input, result);
  const money = (value: number) => Number(value.toFixed(8));
  const cost = failed
    ? money((costs.formulaCost + (result === "Critical Failure" ? costs.baseCostCopper / 20 : 0)) / 100)
    : costs.finalCost;
  const fee = input.craftingFee
    ? input.craftingFee.overrideGp ?? money(costs.totalReduction / 100) : null;

  return [
    input.upgradeFrom ? "Upgrade" : "Crafting",
    date,
    input.character,
    description,
    result,
    String(input.itemLevel),
    dcParts.join("; "),
    String(input.craftingDC),
    input.useAssurance ? "TRUE" : "FALSE",
    String(input.craftingRoll),
    input.clientName?.trim() || input.clientDiscordId?.trim() || "None",
    input.discordRollLink?.trim() || "",
    String(cost),
    fee === null ? "" : String(fee),
    fee === null ? "" : String(money(cost + fee)),
  ];
}

export function formatSheetRow(input: CraftingInput, result: ResultType, endDate: string): string {
  return sheetCells(input, result, endDate).map(safeCell).join("\t");
}
