export const DEFAULT_SHEET_COLUMNS = [
  "Activity", "Date", "Character", "Description", "Status", "Level",
  "DC Mod (rarity, etc.)", "DC", "Assured?", "Roll Result", "Client", "Discord roll link",
  "Cost (after reduction)", "Crafting fee", "Total charged",
] as const;

export type SheetColumn = { id: number | string; label: string; enabled: boolean };
export type SheetLayout = SheetColumn[];

export function defaultSheetLayout(): SheetLayout {
  return DEFAULT_SHEET_COLUMNS.map((label, id) => ({ id, label, enabled: id < 11 }));
}

export function validateSheetLayout(value: unknown): SheetLayout {
  if (!Array.isArray(value) || value.length < 11 || value.length > 35) {
    throw new Error("This sheet layout has the wrong columns.");
  }
  const columns = value.map((entry): SheetColumn => {
    if (!entry || typeof entry !== "object") throw new Error("This sheet layout has an invalid column.");
    const { id, label, enabled } = entry as Partial<SheetColumn>;
    const base = typeof id === "number" && Number.isSafeInteger(id) && id >= 0 && id < DEFAULT_SHEET_COLUMNS.length;
    const blank = typeof id === "string" && /^blank-[1-9]\d*$/.test(id);
    if ((!base && !blank) || typeof label !== "string" || (base && !label.trim()) ||
      (blank && label !== "") || label.length > 60 || /[\t\r\n\u2028\u2029]/.test(label) ||
      typeof enabled !== "boolean") throw new Error("This sheet layout has an invalid column.");
    return { id: id!, label: label.trim(), enabled };
  });
  const ids = new Set(columns.map(column => column.id));
  const baseIds = columns.filter(column => typeof column.id === "number").map(column => column.id as number);
  if (ids.size !== columns.length || ![11, 12, DEFAULT_SHEET_COLUMNS.length].includes(baseIds.length) ||
    baseIds.some(id => id >= baseIds.length) ||
    (baseIds.length < DEFAULT_SHEET_COLUMNS.length && columns.length !== baseIds.length) ||
    !columns.some(column => column.enabled)) throw new Error("The sheet layout must contain each column and show at least one.");
  // Extend older layouts without changing their visible columns or order.
  for (let id = baseIds.length; id < DEFAULT_SHEET_COLUMNS.length; id++) {
    columns.push({ id, label: DEFAULT_SHEET_COLUMNS[id], enabled: false });
  }
  return columns;
}

export function parseSheetLayout(text: string): SheetLayout {
  const data = JSON.parse(text);
  if (data?.version !== 1) throw new Error("Choose a sheet layout exported by this app.");
  return validateSheetLayout(data.columns);
}

export function serializeSheetLayout(columns: SheetLayout): string {
  return JSON.stringify({ version: 1, columns: validateSheetLayout(columns) }, null, 2);
}

export function formatLayoutRow(row: string, columns: SheetLayout): string {
  const cells = row.split("\t");
  return columns.filter(column => column.enabled).map(column =>
    typeof column.id === "number" ? cells[column.id] ?? "" : "").join("\t");
}

export function formatLayoutWithHeaders(row: string, columns: SheetLayout): string {
  const headers = columns.filter(column => column.enabled).map(column =>
    /^[=+\-@]/.test(column.label.trim()) ? `'${column.label}` : column.label).join("\t");
  return `${headers}\n${formatLayoutRow(row, columns)}`;
}
