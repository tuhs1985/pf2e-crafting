import { useEffect, useRef, useState } from 'react';
import type { Proficiency } from './utils/crafting';
import { type CharacterProfile, storageKey, profileKey, validateProfile, parseProfiles,
  serializeProfiles, mergeProfiles } from './utils/characterProfiles';

type Props = { name: string; level: string; proficiency: Proficiency; onLoad: (p: CharacterProfile) => void };
export default function CharacterSaves({ name, level, proficiency, onLoad }: Props) {
  const [loaded, setLoaded] = useState<string>();
  const [picker, setPicker] = useState<'load' | 'delete' | null>(null);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!notice) return;
    const dismiss = () => setNotice('');
    // Capture catches interactions throughout the app, including nested scrollers.
    // The action that creates a notice has already passed this capture phase.
    const events = ['pointerdown', 'click', 'keydown', 'input', 'change', 'scroll', 'wheel', 'touchmove'];
    for (const event of events) document.addEventListener(event, dismiss, { capture: true, passive: true });
    return () => {
      for (const event of events) document.removeEventListener(event, dismiss, true);
    };
  }, [notice]);
  function read() {
    const text = localStorage.getItem(storageKey);
    return text ? parseProfiles(text) : [];
  }
  function write(next: CharacterProfile[]) {
    localStorage.setItem(storageKey, serializeProfiles(next));
    setProfiles(next);
    setPicker(null);
  }
  function attempt(action: () => void) {
    try { action(); } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Browser storage is unavailable.');
    }
  }
  function save() { attempt(() => {
    const profile = validateProfile({ name, level: Number(level), proficiency });
    const current = read();
    const replacing = current.filter(p => profileKey(p.name) === loaded || profileKey(p.name) === profileKey(profile.name));
    if (replacing.length && !window.confirm(`Overwrite saved character${replacing.length > 1 ? 's' : ''}: ${replacing.map(p => p.name).join(', ')}?`)) return;
    write(mergeProfiles(current, [profile], loaded));
    setLoaded(profileKey(profile.name));
    setNotice(`Saved ${profile.name}.`);
  }); }
  function openPicker(mode: 'load' | 'delete') { attempt(() => {
    const current = read();
    if (!current.length) { setPicker(null); setNotice('No saved characters yet.'); return; }
    setProfiles(current); setSelected(current.some(p => profileKey(p.name) === loaded) ? loaded! : profileKey(current[0].name));
    setPicker(mode); setNotice('');
  }); }
  function choose() { attempt(() => {
    const current = read();
    const profile = current.find(p => profileKey(p.name) === selected);
    if (!profile) { setPicker(null); setNotice('That save is no longer available. Open the list again.'); return; }
    if (picker === 'load') {
      onLoad(profile); setLoaded(selected); setPicker(null); setNotice(`Loaded ${profile.name}.`);
    } else if (window.confirm(`Delete the saved character ${profile.name}?`)) {
      write(current.filter(p => profileKey(p.name) !== selected));
      if (loaded === selected) setLoaded(undefined);
      setNotice(`Deleted ${profile.name}. Current form values were kept.`);
    }
  }); }
  function exportAll() { attempt(() => {
    const current = read();
    if (!current.length) { setNotice('Save a character before exporting.'); return; }
    const url = URL.createObjectURL(new Blob([serializeProfiles(current)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'pf2e-characters.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setNotice('Character backup download requested. Check your Downloads.');
  }); }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('This backup is too large (maximum 1 MB).');
      const incoming = parseProfiles(await file.text());
      const current = read();
      const existingNames = new Set(current.map(p => profileKey(p.name)));
      const conflicts = incoming.filter(p => existingNames.has(profileKey(p.name)));
      if (conflicts.length && !window.confirm(`Replace ${conflicts.length} saved character(s) with matching names? Cancel keeps all saves unchanged.`)) return;
      write(mergeProfiles(current, incoming));
      setNotice(`Imported ${incoming.length} character(s). Use Load to select one.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not import this file.'); }
    finally { if (input.current) input.current.value = ''; }
  }
  return <div className="character-saves">
    <div className="character-save-buttons" role="group" aria-label="Saved characters">
      <button type="button" onClick={save}>Save</button>
      <button type="button" onClick={() => openPicker('load')}>Load</button>
      <button type="button" onClick={() => openPicker('delete')}>Delete</button>
      <button type="button" onClick={exportAll}>Export</button>
      <button type="button" onClick={() => input.current?.click()}>Import</button>
    </div>
    <input ref={input} type="file" accept=".json,application/json" hidden onChange={e => void importFile(e.target.files?.[0])} />
    {picker && <div className="character-picker">
      <label>Saved character<select value={selected} onChange={e => setSelected(e.target.value)}>
        {profiles.map(p => <option key={profileKey(p.name)} value={profileKey(p.name)}>{p.name} — Level {p.level}, {p.proficiency}</option>)}
      </select></label>
      <div className="character-picker-actions"><button type="button" onClick={choose}>{picker === 'load' ? 'Load character' : 'Delete character'}</button>
      <button type="button" onClick={() => setPicker(null)}>Cancel</button></div>
    </div>}
    <p className="character-save-note" role="status">{notice}</p>
  </div>;
}
