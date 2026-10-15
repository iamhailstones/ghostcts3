// Run with: node tests/smoke.test.js
// Loads the game with a fake browser and plays every level for a few simulated seconds to catch runtime errors.
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const files = [...html.matchAll(/src="(js\/[a-z]+\.js)"/g)].map(m => m[1]);
const P = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 1 : P, apply: () => P, set: () => true });
const el = () => new Proxy({ style: {}, classList: { toggle() {}, contains: () => false, add() {}, remove() {} }, dataset: {}, value: '', getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }) },
  { get: (t, k) => k in t ? t[k] : (k === 'getContext' ? () => P : () => P), set: (t, k, v) => (t[k] = v, true) });
const store = {};
const ctx = { document: { getElementById: () => el(), querySelectorAll: () => [], createElement: el, addEventListener() {} },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => store[k] = v }, performance: { now: () => 1000 },
  addEventListener() {}, requestAnimationFrame() {}, confirm: () => true, navigator: {}, location: { protocol: 'file:' }, setTimeout, clearTimeout, console };
ctx.window = ctx; vm.createContext(ctx);
const code = files.map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n') + `
;(function(){
  for (let n = 1; n <= 10; n++) {
    score = 0; newLevel(n); $('eb').onclick(); K = { w: true, d: n % 2 === 0 };
    for (let i = 0; i < 900; i++) {
      M.x = 100 + (i * 7) % 700; M.y = 100 + (i * 5) % 400; M.down = i % 3 === 0;
      if (i % 120 === 0) throwBomb(); if (i % 60 === 0) reload();
      if (state === 'play') update(0.016); if (state === 'chal') { cur = null; state = 'play'; }
      if (state === 'end') { state = 'play'; if (G.p.hp <= 0) G.p.hp = 100; }
      draw(); hud();
    }
  }
  this.result = 'Smoke test passed: levels 1-10 simulated without errors';
}).call(this);`;
vm.runInContext(code, ctx);
console.log(ctx.result);
