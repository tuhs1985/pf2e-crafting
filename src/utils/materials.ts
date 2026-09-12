import database from "../data/materials.db.json";

export type MaterialKind = "weapon" | "armor";
export type MaterialGrade = "low" | "standard" | "high";
export interface MaterialRow {
  kind: string;
  material: string;
  grade: string;
  level: number;
  rarity: string;
  basePriceGp: number;
  pricePerBulkGp: number;
  minimumMaterialBaseGp: number;
  minimumMaterialPerBulkGp: number;
}

export const materialRows: MaterialRow[] = database.items;
export const gradeLabels: Record<string, string> = {
  low: "Low-grade", standard: "Standard-grade", high: "High-grade",
};
export function materialLabel(slug: string): string {
  return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function materialKind(itemType: string): MaterialKind | null {
  return itemType === "weapon" || itemType === "armor" ? itemType : null;
}

export function findMaterial(kind: MaterialKind, material: string, grade: string): MaterialRow | undefined {
  return materialRows.find(row => row.kind === kind && row.material === material && row.grade === grade);
}

// Bulk here is the original item's carried Bulk, before material weight changes.
// Foundry prices normal Bulk (ignoring the light remainder), with a minimum of 1.
export function materialAmounts(row: MaterialRow, carriedBulk: number) {
  if (!Number.isFinite(carriedBulk) || carriedBulk < 0) throw new Error("Enter a valid Bulk for material pricing.");
  const bulk = Math.max(1, Math.floor(carriedBulk));
  return {
    price: Number((row.basePriceGp + row.pricePerBulkGp * bulk).toFixed(8)),
    minimum: Number((row.minimumMaterialBaseGp + row.minimumMaterialPerBulkGp * bulk).toFixed(8)),
  };
}

export function parseCarriedBulk(value: string, kind: MaterialKind): number | null {
  const text = value.trim().toLowerCase();
  const bulk = text === "l" ? 0.1 : text === "-" || text === "—" ? 0
    : /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text) ? Number(text) : NaN;
  return Number.isFinite(bulk) ? bulk + (kind === "armor" ? 1 : 0) : null;
}

export function applyMaterial(row: MaterialRow, input: {
  carriedBulk: number; level: number; rarity: string; price: number;
  existingMaterial?: string | null; existingGrade?: string | null;
}) {
  const amounts = materialAmounts(row, input.carriedBulk);
  const existing = input.existingMaterial && input.existingGrade
    ? findMaterial(row.kind as MaterialKind, input.existingMaterial, input.existingGrade) : undefined;
  // An item already made of the selected material keeps its listed price.
  // Changing its material substitutes the material component, not a second charge.
  const price = existing
    ? Math.max(0, input.price - materialAmounts(existing, input.carriedBulk).price + amounts.price)
    : amounts.price;
  const rarities = ["common", "uncommon", "rare", "unique"];
  const rarity = rarities.indexOf(input.rarity.toLowerCase()) >= rarities.indexOf(row.rarity)
    ? input.rarity : row.rarity;
  return { price: Number(price.toFixed(8)), minimum: amounts.minimum,
    level: Math.max(input.level, row.level), rarity };
}
