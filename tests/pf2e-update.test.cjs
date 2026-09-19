const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stableRelease } = require('../scripts/pf2e.cjs');
test('stable release selection excludes Starfinder, modules, drafts, and prereleases', () => {
  const releases = ['sf2e-99.0.0', 'pf2e-anachronism-99.0.0', 'pf2e-8.9.0', 'pf2e-8.10.0', '7.9.0', 'v7.8.0'].map(tag_name=>({tag_name}));
  releases.push({tag_name:'pf2e-9.0.0',prerelease:true},{tag_name:'pf2e-10.0.0',draft:true},{tag_name:'pf2e-11.0.0-beta.1'});
  assert.equal(stableRelease(releases).tag_name, 'pf2e-8.10.0');
  assert.equal(stableRelease([{tag_name:'sf2e-1.0.0'}]), undefined);
});
