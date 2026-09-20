import type { Proficiency } from './crafting';
export type CharacterProfile = { name: string; level: number; proficiency: Proficiency };
export const profileKey = (name: string) => name.trim().toLocaleLowerCase();
export const storageKey = 'pf2e-crafting.characters.v1';
export function validateProfile(value: unknown): CharacterProfile {
  const p = value as CharacterProfile;
  if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 200 ||
    !Number.isInteger(p.level) || p.level < 1 || p.level > 100 ||
    !['trained', 'expert', 'master', 'legendary'].includes(p.proficiency)) {
    throw new Error('Each character needs a name, a whole-number level from 1 to 100, and a proficiency rank.');
  }
  return { name: p.name.trim(), level: p.level, proficiency: p.proficiency };
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
