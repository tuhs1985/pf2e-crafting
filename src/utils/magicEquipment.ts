import data from "../data/magic-equipment.json";

export function magicEquipmentKind(itemType: string, canCustomize = true, materialType?: string | null) {
  if (!canCustomize || materialType) return null;
  return itemType === "weapon" || itemType === "armor" ? itemType : null;
}

export const magicEquipmentOptions = data;

export function applyMagicEquipment(
  option: { label: string; level: number; price: number },
  item: { name: string; level: number; rarity: string },
) {
  return {
    name: `${item.name} (${option.label})`,
    level: Math.max(item.level, option.level),
    rarity: item.rarity,
    price: option.price,
  };
}
