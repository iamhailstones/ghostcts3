// Run with: node tests/score.test.js
// Two scores: the total score is kept across levels and retries; the level score resets whenever a level starts or is retried.
// the Python tuple rearm, the empty-magazine pop-up trigger, credits and saving.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/src="(js\/[a-z]+\.js)"/g)].map(m => m[1]);
const P = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 1 : P, apply: () => P, set: () => true });
const el = () => new Proxy({ style: {}, classList: { toggle() {}, contains: () => false, add() {}, remove() {} }, dataset: {}, value: '' }, { get: (t, k) => k in t ? t[k] : () => P, set: (t, k, v) => (t[k] = v, true) });
const store = {};
const ctx = { document: { getElementById: () => el(), querySelectorAll: () => [], createElement: el, addEventListener() {} }, localStorage: { getItem: k => store[k] || null, setItem: (k, v) => store[k] = v },
  performance: { now: () => 1000 }, addEventListener() {}, requestAnimationFrame() {}, confirm: () => true, navigator: {}, location: { protocol: 'file:' }, setTimeout, clearTimeout, console };
ctx.window = ctx; vm.createContext(ctx);
const code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') + `
;(function(){const out=[];const t=(n,c)=>out.push([n,!!c]);
 score=0;newLevel(1);state='play';t('both scores start at 0',score===0&&levelScore===0);
 const kill=pts=>{const e=mk('grunt',100,100);e.pts=pts;G.enemies.push(e);hurt(e,9999)};
 G.combo=0;G.comboT=0;kill(10);t('a kill adds to both scores',score===10&&levelScore===10);
 addScore(50);t('challenge points add to both scores',score===60&&levelScore===60);
 newLevel(1);state='play';t('retry resets the level score to 0',levelScore===0);t('retry keeps the total score',score===60);
 G.combo=0;G.comboT=0;kill(10);t('after a retry both scores count again',score===70&&levelScore===10);
 G.spawned=G.total;G.enemies.length=0;levelDone();const done=levelScore;t('level bonus counts in both scores',done>10&&score===60+done);
 const total=score;newLevel(2);state='play';t('a new level starts the level score at 0',levelScore===0);t('a new level keeps the total score',score===total);
 G.combo=0;G.comboT=0;kill(10);t('level 2 points add to the total across levels',score===total+10&&levelScore===10);
 const e2=mk('grunt',300,300);e2.hp=1;e2.pts=5;G.enemies.push(e2);const s0=score,l0=levelScore;explode(300,300,100,100,1);
 t('bomb bonus counts in both scores',score-s0>=30&&levelScore-l0===score-s0);
 this.out=out}).call(this);`;
vm.runInContext(code, ctx);
let fails = 0; ctx.out.forEach(([n, ok]) => { if (!ok) { fails++; console.log('FAIL', n); } });
console.log(fails ? fails + ' check(s) failed' : 'All ' + ctx.out.length + ' score checks passed'); process.exit(fails ? 1 : 0);
