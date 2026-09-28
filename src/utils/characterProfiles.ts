import type { Proficiency } from './crafting';
import { validateSheetLayout, type SheetLayout } from './sheetLayout';
export type SheetTemplate = { name: string; layout: SheetLayout };
export type CharacterProfile = { name: string; level: number; proficiency: Proficiency;
  sheetLayout?: SheetLayout; sheetTemplates?: SheetTemplate[]; activeSheetTemplate?: string };
export const profileKey = (name: string) => name.trim().toLocaleLowerCase();
export const storageKey = 'pf2e-crafting.characters.v1';
export function validateSheetTemplates(value: unknown): SheetTemplate[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw new Error('A character can have up to 10 sheet templates.');
  }
  const templates = value.map((entry): SheetTemplate => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid sheet template.');
    const { name, layout } = entry as Partial<SheetTemplate>;
    if (typeof name !== 'string' || !name.trim() || name.length > 50 || /[\t\r\n]/.test(name)) {
      throw new Error('Each sheet template needs a name of 50 characters or fewer.');
    }
    const trimmed = name.trim();
    return { name: profileKey(trimmed) === 'default' ? 'Default' : trimmed,
      layout: validateSheetLayout(layout) };
  });
  if (!templates.some(t => profileKey(t.name) === 'default') ||
    new Set(templates.map(t => profileKey(t.name))).size !== templates.length) {
    throw new Error('Sheet templates need a unique name and a Default template.');
  }
  return templates;
}
export function validateProfile(value: unknown): CharacterProfile {
  const p = value as CharacterProfile;
  if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 200 ||
    !Number.isInteger(p.level) || p.level < 1 || p.level > 100 ||
    !['trained', 'expert', 'master', 'legendary'].includes(p.proficiency)) {
    throw new Error('Each character needs a name, a whole-number level from 1 to 100, and a proficiency rank.');
  }
  const profile: CharacterProfile = { name: p.name.trim(), level: p.level, proficiency: p.proficiency };
  if (p.sheetLayout !== undefined) profile.sheetLayout = validateSheetLayout(p.sheetLayout);
  if (p.sheetTemplates !== undefined) {
    profile.sheetTemplates = validateSheetTemplates(p.sheetTemplates);
    if (typeof p.activeSheetTemplate !== 'string' ||
      !profile.sheetTemplates.some(t => profileKey(t.name) === profileKey(p.activeSheetTemplate!))) {
      throw new Error('Select a saved sheet template.');
    }
    profile.activeSheetTemplate = profile.sheetTemplates.find(t =>
      profileKey(t.name) === profileKey(p.activeSheetTemplate!))!.name;
  } else if (p.activeSheetTemplate !== undefined) {
    throw new Error('The selected sheet template is missing.');
  }
  return profile;
}
export function parseProfiles(text: string): CharacterProfile[] {
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.characters) || data.characters.length > 1000) {
    throw new Error('Choose a character backup exported by this app.');
  }
  const profiles = data.characters.map(validateProfile);
  if (new Set(profiles.map((p: CharacterProfile) => profileKey(p.name))).size !== profiles.length) {
    throw new Error('The backup contains duplicate character names.');
  }
  return profiles;
}
export function serializeProfiles(characters: CharacterProfile[]) {
  return JSON.stringify({ version: 1, characters }, null, 2);
}
export function mergeProfiles(existing: CharacterProfile[], incoming: CharacterProfile[]) {
  const names = new Set(incoming.map(p => profileKey(p.name)));
  return [...existing.filter(p => !names.has(profileKey(p.name))), ...incoming];
}
