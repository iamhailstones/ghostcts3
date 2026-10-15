// Run with: node tests/pause.test.js
// Pause screen (resume, main menu) and movement keys (WASD and arrow keys), using a fake page that remembers state.
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), files = [...html.matchAll(/src="(js\/[a-z]+\.js)"/g)].map(m => m[1]);
const P = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 1 : P, apply: () => P, set: () => true });
const els = {}, mk = id => { const s = new Set(); return { id, style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', onclick: null,
  classList: { contains: c => s.has(c), add: c => s.add(c), remove: c => s.delete(c), toggle: (c, f) => { (f === undefined ? !s.has(c) : f) ? s.add(c) : s.delete(c); } },
  addEventListener() {}, blur() {}, focus() {}, setAttribute() {}, appendChild() {}, getContext: () => P, querySelectorAll: () => ({ forEach() {} }), getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }) }; };
const ctx = { document: { getElementById: id => els[id] || (els[id] = mk(id)), querySelectorAll: () => [], createElement: () => mk('x'), addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} }, performance: { now: () => 1000 }, addEventListener() {}, requestAnimationFrame() {}, confirm: () => true, navigator: {}, location: { protocol: 'file:' }, setTimeout, clearTimeout, console };
ctx.window = ctx; vm.createContext(ctx);
const code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') + `
;(function(){const out=[],t=(n,c)=>out.push([n,!!c]),on=id=>$(id).classList.contains('on');
 score=0;newLevel(1);$('eb').onclick();t('level starts after the briefing',state==='play');
 $('pbtn').onclick({target:{blur(){}}});t('pause button opens the pause screen',state==='pause'&&on('pause'));
 $('resume').onclick();t('resume returns to the game',state==='play'&&!on('pause'));
 K={w:true};M.down=true;$('pbtn').onclick({target:{blur(){}}});$('tomenu').onclick();t('first MAIN MENU click only asks for confirmation',state==='pause'&&G!==null);$('tomenu').onclick();
 t('main menu shows the menu and hides the pause screen',state==='menu'&&on('menu')&&!on('pause'));t('leaving clears the game and held keys',G===null&&!K.w&&!M.down);
 $('play').onclick();t('PLAY after returning starts a level again',G!==null&&(state==='end'||state==='play'));
 $('eb').onclick();state='play';G.enemies.length=0;G.total=0;
 const move=(keys)=>{const p=G.p;p.x=450;p.y=300;K=keys;update(.1);const r=[p.x-450,p.y-300];K={};return r};
 let r=move({arrowleft:true});t('left arrow moves left',r[0]<-20&&Math.abs(r[1])<.01);
 r=move({arrowright:true});t('right arrow moves right',r[0]>20);r=move({arrowup:true});t('up arrow moves up',r[1]<-20);r=move({arrowdown:true});t('down arrow moves down',r[1]>20);
 r=move({d:true});const wasd=Math.hypot(r[0],r[1]);r=move({arrowup:true,arrowright:true});t('arrow diagonals are not faster than WASD',Math.abs(Math.hypot(r[0],r[1])-wasd)<.5);
 r=move({w:true,arrowup:true});t('holding W and up arrow together does not double speed',Math.abs(Math.hypot(r[0],r[1])-wasd)<.5);
 this.out=out}).call(this);`;
vm.runInContext(code, ctx);
let fails = 0; ctx.out.forEach(([n, ok]) => { if (!ok) { fails++; console.log('FAIL', n); } });
console.log(fails ? fails + ' check(s) failed' : 'All ' + ctx.out.length + ' pause and movement checks passed'); process.exit(fails ? 1 : 0);
