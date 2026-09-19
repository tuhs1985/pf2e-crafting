const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const filename = path.join(__dirname, '../src/utils', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, require: createRequire(filename) };
  vm.runInNewContext(code, context);
  return context.exports;
}
const { parseProfiles, serializeProfiles, mergeProfiles, validateProfile } = load('characterProfiles.ts');
const a = {name:'Alice',level:5,proficiency:'expert'};
test('character backups round trip only intended fields', () => {
  const result=parseProfiles(serializeProfiles([{...a,item:'Sword'}]));
  assert.equal(JSON.stringify(result),JSON.stringify([a]));
});
test('invalid backups and duplicates are rejected before merging', () => {
  for (const data of [{version:2,characters:[a]}, {version:1,characters:[a,{...a,name:' ALICE '}]}, {version:1,characters:[{...a,level:0}]}, {version:1,characters:[{...a,proficiency:'god'}]}]) assert.throws(()=>parseProfiles(JSON.stringify(data)));
  assert.throws(()=>parseProfiles('oops'));
  assert.throws(()=>validateProfile({...a,name:' '}));
});
test('saving renamed loaded profile handles both loaded and name collisions', () => {
  const b={...a,name:'Bob'};
  const result=mergeProfiles([a,b],[{...b,level:9}],'alice');
  assert.equal(result.length,1); assert.equal(result[0].level,9);
  assert.equal(a.level,5);
});
test('import merges new profiles and replaces case-insensitive matches', () => {
  const result=mergeProfiles([a],[{...a,name:'ALICE',level:6},{...a,name:'Bob'}]);
  assert.equal(result.length,2); assert.equal(result[0].level,6);
});

test('script-looking names remain plain strings and extra fields are discarded', () => {
  const name = '<script>alert(1)</script><img src=x onerror=alert(1)>';
  const result = parseProfiles(JSON.stringify({version:1,characters:[{...a,name,script:'alert(1)',html:'<iframe>'}]}));
  assert.equal(result[0].name,name);
  assert.equal(JSON.stringify(Object.keys(result[0])),JSON.stringify(['name','level','proficiency']));
});
test('prototype keys in JSON do not enter saved profiles or pollute objects', () => {
  const result = parseProfiles('{"version":1,"characters":[{"name":"Safe","level":1,"proficiency":"trained","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}]}');
  assert.equal(Object.hasOwn(result[0],'__proto__'),false);
  assert.equal(Object.hasOwn(result[0],'constructor'),false);
  assert.equal({}.polluted,undefined);
});
test('non-JSON scripts, wrong field types, and excessive profile counts are rejected', () => {
  assert.throws(()=>parseProfiles('<script>alert(1)</script>'));
  assert.throws(()=>parseProfiles('alert(1)'));
  assert.throws(()=>parseProfiles(JSON.stringify({version:1,characters:[{...a,name:{script:'oops'}}]})));
  assert.throws(()=>parseProfiles(JSON.stringify({version:1,characters:Array(1001).fill(a)})));
});
