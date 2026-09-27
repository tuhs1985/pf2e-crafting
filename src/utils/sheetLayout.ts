export const DEFAULT_SHEET_COLUMNS = [
  "Activity", "Date", "Character", "Description", "Status", "Level",
  "DC Mod (rarity, etc.)", "DC", "Assured?", "Roll Result", "Client",
] as const;

export type SheetColumn = { id: number; label: string; enabled: boolean };
export type SheetLayout = SheetColumn[];

export function defaultSheetLayout(): SheetLayout {
  return DEFAULT_SHEET_COLUMNS.map((label, id) => ({ id, label, enabled: true }));
}

export function validateSheetLayout(value: unknown): SheetLayout {
  if (!Array.isArray(value) || value.length !== DEFAULT_SHEET_COLUMNS.length) {
    throw new Error("This sheet layout has the wrong columns.");
  }
  const columns = value.map((entry): SheetColumn => {
    if (!entry || typeof entry !== "object") throw new Error("This sheet layout has an invalid column.");
    const { id, label, enabled } = entry as Partial<SheetColumn>;
    if (!Number.isInteger(id) || !Number.isSafeInteger(id) || id! < 0 || id! >= DEFAULT_SHEET_COLUMNS.length ||
      typeof label !== "string" || !label.trim() || label.length > 60 || /[\t\r\n\u2028\u2029]/.test(label) ||
      typeof enabled !== "boolean") throw new Error("This sheet layout has an invalid column.");
    return { id: id!, label: label.trim(), enabled };
  });
  if (new Set(columns.map(column => column.id)).size !== DEFAULT_SHEET_COLUMNS.length ||
    !columns.some(column => column.enabled)) throw new Error("The sheet layout must contain each column and show at least one.");
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
  return columns.filter(column => column.enabled).map(column => cells[column.id] ?? "").join("\t");
}

export function formatLayoutWithHeaders(row: string, columns: SheetLayout): string {
  const headers = columns.filter(column => column.enabled).map(column =>
    /^[=+\-@]/.test(column.label.trim()) ? `'${column.label}` : column.label).join("\t");
  return `${headers}\n${formatLayoutRow(row, columns)}`;
}
