const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const upstream = path.join(root, 'upstream', 'pf2e');
const sparse = ['packs/pf2e/equipment', 'src/module/item/physical'];
function git(args, cwd = root) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}
function stableRelease(releases) {
  return releases.filter(r => !r.draft && !r.prerelease && /^(?:pf2e-|v)?\d+\.\d+\.\d+$/.test(r.tag_name))
    .sort((a, b) => {
      const av = a.tag_name.replace(/^(pf2e-|v)/, '').split('.').map(Number);
      const bv = b.tag_name.replace(/^(pf2e-|v)/, '').split('.').map(Number);
      return bv[0]-av[0] || bv[1]-av[1] || bv[2]-av[2];
    })[0];
}
async function latestRelease() {
  // Scan recent release pages: the repository also publishes SF2e and modules.
  const releases = [];
  for (let page = 1; page <= 10; page++) {
    const response = await fetch(`https://api.github.com/repos/foundryvtt/pf2e/releases?per_page=100&page=${page}`,
      { headers: { 'User-Agent': 'pf2e-crafting-updater' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`GitHub release lookup failed (${response.status}); retry later.`);
    const batch = await response.json();
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  const release = stableRelease(releases);
  if (!release) throw new Error('No stable PF2e system release found.');
  return release;
}
function setup() {
  git(['submodule', 'update', '--init', '--filter=blob:none', '--', 'upstream/pf2e']);
  git(['sparse-checkout', 'set', ...sparse], upstream);
}
async function main() {
  const mode = process.argv[2];
  if (!['setup', 'update', 'import'].includes(mode)) throw new Error('Use setup, update, or import.');
  if (fs.existsSync(path.join(upstream, '.git')) && git(['status', '--porcelain'], upstream)) {
    throw new Error('Upstream checkout has local edits. Save or revert them before continuing.');
  }
  if (!fs.existsSync(path.join(upstream, '.git')) || mode === 'setup') setup();
  if (mode === 'setup') { console.log('Pinned PF2e checkout is ready.'); return; }
  const previous = git(['rev-parse', 'HEAD'], upstream);
  const outputs = ['src/data/items.db.json', 'src/data/materials.db.json', 'data/materials.source.json', 'data/pf2e-version.json'];
  const backups = outputs.map(file => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file)) : null);
  try {
    if (mode === 'update') {
      const release = await latestRelease();
      console.log(`Updating to ${release.tag_name}`);
      git(['fetch', '--depth=1', 'origin', `refs/tags/${release.tag_name}:refs/tags/${release.tag_name}`], upstream);
      git(['checkout', '--detach', release.tag_name], upstream);
    }
    const before = JSON.parse(backups[0]);
    for (const script of ['build-items-db.cjs', 'build-materials-db.cjs']) {
      execFileSync(process.execPath, [script], { cwd: root, stdio: 'inherit' });
    }
    const version = { repository: 'https://github.com/foundryvtt/pf2e',
      release: git(['describe', '--tags', '--exact-match'], upstream), revision: git(['rev-parse', 'HEAD'], upstream) };
    fs.writeFileSync(path.join(root, 'data/pf2e-version.json'), JSON.stringify(version, null, 2)+'\n');
    const tests = fs.readdirSync(path.join(root, 'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>`tests/${f}`);
    execFileSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
    execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: root, stdio: 'inherit' });
    const after = JSON.parse(fs.readFileSync(path.join(root, outputs[0])));
    const old = new Set(before.n), current = new Set(after.n);
    const added = after.n.filter(n=>!old.has(n)), removed = before.n.filter(n=>!current.has(n));
    const decode = (db, i) => {
      const r = db.i[i];
      return [db.r[r[0]], db.c[r[1]], db.b[r[2]], db.p[r[3]], r[4], r[5], db.m[i]];
    };
    const oldRows = new Map(before.n.map((name,i)=>[name,JSON.stringify(decode(before,i))]));
    const changed = after.n.filter((name,i)=>oldRows.has(name) && oldRows.get(name)!==JSON.stringify(decode(after,i)));
    console.log(`PF2e ${version.release}: ${after.n.length} items; ${added.length} added, ${removed.length} removed, ${changed.length} changed.`);
    if (changed.length) console.log('Changed: '+changed.join(', '));
    if (added.length) console.log('Added: '+added.join(', '));
    if (removed.length) console.log('Removed: '+removed.join(', '));
    console.log('Validation and build passed. Review, commit, push, then run npm run deploy when ready.');
  } catch (error) {
    git(['checkout', '--detach', previous], upstream);
    outputs.forEach((file,i)=> { const target=path.join(root,file); if (backups[i]) fs.writeFileSync(target,backups[i]); else if(fs.existsSync(target)) fs.unlinkSync(target); });
    throw new Error(`Update failed; previous checkout and generated source data restored. Do not deploy a failed build. ${error.message}`);
  }
}
if (require.main === module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports = { stableRelease };
