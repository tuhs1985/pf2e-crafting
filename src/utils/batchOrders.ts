import { calculateEndDate, formatSummary, getResultType, type CraftingInput, type Proficiency } from "./crafting";
import { formatSheetRow } from "./sheetOutput";
import { formatLayoutRow, formatLayoutWithHeaders, type SheetLayout } from "./sheetLayout";

export const BATCH_STORAGE_KEY = "pf2e-crafting-batch-v1";

// Keep the editable fields as well as the calculated input: customization
// controls cannot be reconstructed reliably from the resulting item price.
export interface OrderForm {
  character: string; characterLevel: string; proficiency: Proficiency;
  clientName: string; clientDiscordId: string; itemName: string; itemLevel: string;
  itemRarity: string; itemCategory: string; itemBulk: string; itemCost: string;
  costModifier: string; useMaterial: boolean; useMagic: boolean; magicIndex: number;
  useUpgrade: boolean; upgradeChoice: number; runeTransfer: "" | "item" | "runestone";
  selectedMaterial: string; selectedGrade: string; quantity: number;
  hasFormula: boolean; formulaOption: "" | "buy" | "work"; startDate: string;
  additionalDays: string; useAssurance: boolean; naturalRoll: "" | "20" | "1";
  craftingDC: string; dcAdjustment: string; craftingRoll: string; discordRollLink: string;
  addCraftingFee: boolean; feeOverride: string;
}
export interface BatchOrder {
  id: string;
  input: CraftingInput;
  form: OrderForm;
  overlapAllowed: boolean;
}
export interface BatchSession {
  version: 1;
  orders: BatchOrder[];
  draft: OrderForm;
  editingId: string | null;
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` === value;
}

export function orderEndDate(input: CraftingInput): string {
  const result = getResultType(input.craftingDC, input.craftingRoll, input.naturalRoll);
  const failed = result === "Failure" || result === "Critical Failure";
  return calculateEndDate(input.startDate, input.setupDays, failed ? 0 : input.additionalDays);
}

export function orderConflicts(candidate: BatchOrder, orders: BatchOrder[]): BatchOrder[] {
  const end = orderEndDate(candidate.input);
  if (!validDate(candidate.input.startDate) || !validDate(end)) return [];
  return orders.filter(order => order.id !== candidate.id &&
    validDate(order.input.startDate) && validDate(orderEndDate(order.input)) &&
    candidate.input.startDate <= orderEndDate(order.input) && order.input.startDate <= end);
}

export function replaceOrder(orders: BatchOrder[], order: BatchOrder): BatchOrder[] {
  return orders.some(existing => existing.id === order.id)
    ? orders.map(existing => existing.id === order.id ? order : existing)
    : [...orders, order];
}

export function batchSummary(orders: BatchOrder[]): string {
  return orders.map(({ input }) => formatSummary(input,
    getResultType(input.craftingDC, input.craftingRoll, input.naturalRoll), orderEndDate(input)).trim()).join("\n\n");
}

export function batchSheet(orders: BatchOrder[], layout: SheetLayout, headers = false): string {
  return orders.map(({ input }, index) => {
    const row = formatSheetRow(input, getResultType(input.craftingDC, input.craftingRoll, input.naturalRoll), orderEndDate(input));
    return headers && index === 0 ? formatLayoutWithHeaders(row, layout) : formatLayoutRow(row, layout);
  }).join("\n");
}

// Storage is untrusted input. Check all fields and discard unknown properties.
const stringFields = ["character", "characterLevel", "clientName", "clientDiscordId", "itemName", "itemLevel",
  "itemRarity", "itemCategory", "itemBulk", "itemCost", "costModifier", "selectedMaterial", "selectedGrade",
  "startDate", "additionalDays", "craftingDC", "dcAdjustment", "craftingRoll", "discordRollLink", "feeOverride"] as const;
const booleanFields = ["useMaterial", "useMagic", "useUpgrade", "hasFormula", "useAssurance", "addCraftingFee"] as const;
function readForm(value: unknown): OrderForm {
  if (!value || typeof value !== "object") throw new Error("Invalid batch draft.");
  const data = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of stringFields) {
    if (typeof data[key] !== "string" || data[key].length > 2000) throw new Error("Invalid batch field.");
    result[key] = data[key];
  }
  for (const key of booleanFields) {
    if (typeof data[key] !== "boolean") throw new Error("Invalid batch option.");
    result[key] = data[key];
  }
  for (const key of ["magicIndex", "upgradeChoice", "quantity"] as const) {
    if (!Number.isSafeInteger(data[key]) || Number(data[key]) < (key === "quantity" ? 1 : 0) || Number(data[key]) > 10000) throw new Error("Invalid batch quantity.");
    result[key] = data[key];
  }
  const choices = { proficiency: ["trained", "expert", "master", "legendary"],
    runeTransfer: ["", "item", "runestone"], formulaOption: ["", "buy", "work"], naturalRoll: ["", "20", "1"] };
  for (const [key, values] of Object.entries(choices)) {
    if (!values.includes(data[key] as string)) throw new Error("Invalid batch option.");
    result[key] = data[key];
  }
  return result as unknown as OrderForm;
}

function readInput(value: unknown): CraftingInput {
  if (!value || typeof value !== "object") throw new Error("Invalid saved order.");
  const input = value as CraftingInput;
  for (const key of ["character", "itemName", "itemRarity", "itemCategory", "itemBulk", "startDate"] as const) {
    if (typeof input[key] !== "string" || input[key].length > 2000) throw new Error("Invalid saved order text.");
  }
  if (input.startDate && !validDate(input.startDate)) throw new Error("Invalid saved order date.");
  for (const key of ["itemLevel", "itemCost", "quantity", "characterLevel", "craftingDC", "dcAdjustment", "craftingRoll", "setupDays", "additionalDays"] as const) {
    if (!Number.isFinite(input[key]) || Math.abs(input[key]) > 1e12) throw new Error("Invalid saved order number.");
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || !Number.isInteger(input.setupDays) || input.setupDays < 1 ||
    !Number.isInteger(input.additionalDays) || input.additionalDays < 0 || input.itemCost < 0 ||
    typeof input.hasFormula !== "boolean" || typeof input.useAssurance !== "boolean" ||
    !["trained", "expert", "master", "legendary"].includes(input.proficiency) ||
    !["", "buy", "work"].includes(input.formulaOption) ||
    ![undefined, "", "1", "20"].includes(input.naturalRoll) ||
    ![undefined, "item", "runestone"].includes(input.runeTransfer)) throw new Error("Invalid saved order options.");
  for (const key of ["clientName", "clientDiscordId", "discordRollLink", "costModifier", "upgradeFrom", "runeTransferTarget"] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || input[key].length > 2000)) throw new Error("Invalid saved order text.");
  }
  if (input.craftingFee && (typeof input.craftingFee !== "object" ||
    (input.craftingFee.overrideGp !== undefined && (!Number.isFinite(input.craftingFee.overrideGp) || input.craftingFee.overrideGp < 0)))) throw new Error("Invalid saved fee.");
  if (input.preciousMaterial && (typeof input.preciousMaterial.name !== "string" || typeof input.preciousMaterial.grade !== "string" ||
    !Number.isFinite(input.preciousMaterial.minimumGpPerItem))) throw new Error("Invalid saved material.");
  for (const key of ["ammunitionPackSize", "runestoneCost"] as const) {
    if (input[key] !== undefined && (!Number.isFinite(input[key]) || input[key] < 0)) throw new Error("Invalid saved price.");
  }
  // Formatter checks modifiers and fee values too, before anything reaches the UI.
  if (input.startDate && !validDate(orderEndDate(input))) throw new Error("Invalid saved duration.");
  formatSummary(input, getResultType(input.craftingDC, input.craftingRoll, input.naturalRoll), orderEndDate(input));
  const clean: Record<string, unknown> = {};
  for (const key of ["character", "clientName", "clientDiscordId", "discordRollLink", "itemName", "itemLevel",
    "itemRarity", "itemCategory", "itemBulk", "itemCost", "runeTransfer", "runeTransferTarget", "runestoneCost",
    "quantity", "ammunitionPackSize", "hasFormula", "formulaOption", "startDate", "characterLevel", "proficiency",
    "useAssurance", "naturalRoll", "craftingDC", "dcAdjustment", "craftingRoll", "setupDays", "additionalDays",
    "costModifier", "upgradeFrom"] as const) {
    if (input[key] !== undefined) clean[key] = input[key];
  }
  if (input.craftingFee) clean.craftingFee = input.craftingFee.overrideGp === undefined ? {} : { overrideGp: input.craftingFee.overrideGp };
  if (input.preciousMaterial) clean.preciousMaterial = { name: input.preciousMaterial.name,
    grade: input.preciousMaterial.grade, minimumGpPerItem: input.preciousMaterial.minimumGpPerItem };
  return clean as unknown as CraftingInput;
}

export function parseBatch(text: string): BatchSession {
  if (text.length > 1_000_000) throw new Error("Saved batch is too large.");
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.orders) || data.orders.length > 100) throw new Error("Invalid saved batch.");
  const ids = new Set<string>();
  const orders = data.orders.map((value: unknown): BatchOrder => {
    const order = value as BatchOrder;
    if (!order || typeof order.id !== "string" || order.id.length > 100 || ids.has(order.id) || typeof order.overlapAllowed !== "boolean") throw new Error("Invalid saved order.");
    ids.add(order.id);
    return { id: order.id, input: readInput(order.input), form: readForm(order.form), overlapAllowed: order.overlapAllowed };
  });
  if (orders.some((order: BatchOrder) => order.input.character !== orders[0].input.character ||
    order.form.character !== order.input.character)) throw new Error("Batch has different characters.");
  const draft = readForm(data.draft);
  if (orders.length && draft.character !== orders[0].input.character) throw new Error("Batch draft has a different character.");
  return { version: 1, orders, draft, editingId: ids.has(data.editingId) ? data.editingId : null };
}
