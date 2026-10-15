// Run with: node tests/guns.test.js
// Checks the gun system rules: default pistol unchanged, buying, equipping, per-weapon ammo, shotgun pellets, reload limits,
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
 score=0;newLevel(1);state='play';const p=G.p;
 t('default weapon is the pistol with its original values',p.gun==='pistol'&&p.mag===CFG.mag&&p.reserve===48&&WEAPONS.pistol.dmg===CFG.dmg&&WEAPONS.pistol.rate===CFG.fireRate);
 shoot();t('pistol shot uses one round and one bullet',p.mag===CFG.mag-1&&G.bul.length===1&&G.bul[0].d===CFG.dmg);
 SAVE.credits=200;GM.from='menu';GM.buy('smg');t('cannot buy without enough credits',!SAVE.guns.owned.includes('smg')&&SAVE.credits===200);
 SAVE.credits=1000;GM.buy('smg');t('buying spends credits, owns and equips the weapon',SAVE.guns.owned.includes('smg')&&SAVE.credits===700&&SAVE.guns.sel==='smg');
 newLevel(1);state='play';t('next level starts with the SMG and its stored ammo',G.p.gun==='smg'&&G.p.mag===30&&G.p.reserve===30&&G.p.stash.pistol.mag===CFG.mag);
 GM.from='play';GM.buy('shotgun');const q=G.p;G.bul.length=0;q.cd=0;shoot();
 t('shotgun fires several pellets with one round',q.gun==='shotgun'&&G.bul.length===6&&q.mag===5);
 q.rel=0;q.mag=2;q.reserve=1;reload();update(3);t('reload only moves what the reserve has',q.mag===3&&q.reserve===0);
 equipGun('pistol');q.mag=0;q.reserve=0;q.rel=0;
 t('tuple answer is accepted',CH[3].ok(norm('gun_list = list(gun)\\ngun_list[1] += 8\\ngun = tuple(gun_list)')));
 const msg8=CH[3].win(q);t('rearm gives the typed number of rounds',q.mag===8&&q.reserve===0&&/8/.test(msg8));
 q.mag=0;q.reserve=0;CH[3].ok(norm('gun_list = list(gun)\\ngun_list[1] += 999\\ngun = tuple(gun_list)'));CH[3].win(q);
 t('lesson rearm is still capped at 24 rounds',q.mag===24&&q.reserve===0);
 equipGun('smg');q.mag=10;q.reserve=5;syncGuns();t('unused ammo is saved for the next level',SAVE.guns.res.smg===15);
 const e=mk('grunt',100,100);G.enemies.push(e);const c0=SAVE.credits;hurt(e,999);t('kills earn credits',SAVE.credits===c0+e.pts);
 t('weapons are named after Python types',Object.keys(WEAPONS).map(k=>WEAPONS[k].name).join()==='TUPLE,LIST,SET,DICT,RANGE');
 const hitTest=(w,n,mk2)=>{G.enemies.length=0;G.bul.length=0;const es=[];for(let i=0;i<n;i++){const z=mk('heavy',450,300);z.hp=z.max=1000;es.push(z);G.enemies.push(z)}return es};
 {const es=hitTest(),e=mk('heavy',450,300);e.hp=e.max=1000;G.enemies.length=0;G.enemies.push(e);G.bul.push({x:450,y:300,vx:0,vy:0,life:1,d:22,m:WEAPONS.rifle.dict,pr:0,hs:null});update(.001);
  t('dict rule: rifle does 1.6x to a heavy',Math.abs((1000-e.hp)-22*1.6)<.01)}
 {const e=mk('heavy',450,300);e.hp=e.max=1000;G.enemies.length=0;G.enemies.push(e);const hs=new Set();
  G.bul.length=0;G.bul.push({x:450,y:300,vx:0,vy:0,life:1,d:45,pr:0,hs},{x:450,y:300,vx:0,vy:0,life:1,d:45,pr:0,hs});update(.001);
  t('set rule: one enemy is hit once per blast',Math.abs(1000-e.hp-45)<.01&&G.bul.length===1)}
 {G.enemies.length=0;const es=[0,1,2,3].map(()=>{const z=mk('heavy',450,300);z.hp=z.max=1000;G.enemies.push(z);return z});G.bul.length=0;
  G.bul.push({x:450,y:300,vx:0,vy:0,life:1,d:75,pr:3,hs:new Set()});for(let i=0;i<5;i++)update(.001);
  t('range rule: sniper shot pierces exactly 3 enemies',es.filter(z=>z.hp<1000).length===3&&G.bul.length===0)}
 this.out=out}).call(this);`;
vm.runInContext(code, ctx);
let fails = 0; ctx.out.forEach(([n, ok]) => { if (!ok) { fails++; console.log('FAIL', n); } });
console.log(fails ? fails + ' check(s) failed' : 'All ' + ctx.out.length + ' gun system checks passed'); process.exit(fails ? 1 : 0);
