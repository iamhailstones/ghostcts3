// Run with: node tests/rules.test.js
// Python rules: the statement interpreter, every weapon's rule console (valid and invalid operations), the tuple workflow,
// bomb inventory and the lesson indentation checker.
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
;(function(){const out=[],t=(n,c)=>out.push([n,!!c]);
 const err=(src,env)=>{try{Py.run(src,env);return''}catch(e){return e.message}};
 // --- interpreter speaks real Python errors ---
 let e={a:PT([1,2])};t('tuple item assignment is a TypeError',err('a[0] = 5',e)==="TypeError: 'tuple' object does not support item assignment");
 t('tuple has no append',err('a.append(3)',e)==="AttributeError: 'tuple' object has no attribute 'append'");
 e={a:PT([1,2])};Py.run('a = list(a)\\na[0] = 9\\na = tuple(a)',e);t('tuple -> list -> edit -> tuple works',fmt(e.a)==='(9, 2)');
 e={s:St([1])};Py.run('s.add(1)\\ns.add(2)',e);t('a set keeps values unique',e.s.v.size===2);
 e={d:{t:'dict',v:new Map([['mag',0]])}};t('missing dict key is a KeyError',err('x = d["zzz"]',e)==='KeyError: "zzz"'||/KeyError/.test(err('x = d["zzz"]',e)));
 t('unknown name is a NameError',/NameError/.test(err('b = zzz',{})));t('indented statement is an IndentationError',/IndentationError/.test(err('  a = 1',{})));
 // --- tuple weapon workflow ---
 score=0;newLevel(1);state='play';const p=G.p;p.mag=1;p.reserve=48;G.bul.length=0;p.cd=0;M.down=false;shoot();
 t('using the last round pauses the game',state==='pyr'&&p.mag===0);t('ammo is a real tuple (0, 48)',fmt(PR.env.ammo)==='(0, 48)');
 t('a second open does not stack popups',(PR.open('empty'),state==='pyr'));
 t('direct edit is rejected with a rule violation',!PR.exec('ammo[0] = 12')&&/TypeError/.test(PR.err)&&PR.reason==='violation'&&fmt(PR.env.ammo)==='(0, 48)');
 t('cannot resume while the tuple is empty',PR.check().mag===0);PR.commit();t('resume is refused without ammo',state==='pyr'&&p.mag===0);
 PR.exec('ammo = list(ammo)');t('conversion changes the real state to a list',PR.env.ammo.t==='list');
 PR.exec('ammo[0] = 12\\nammo[1] = ammo[1] - 12');t('a list stays invalid for a tuple weapon',!!PR.check().err&&/tuple/.test(PR.check().err));PR.commit();t('resume refused until converted back',state==='pyr');
 PR.exec('ammo = tuple(ammo)');t('valid tuple (12, 36) is accepted',PR.check().mag===12&&PR.check().reserve===36);PR.commit();
 t('ammo counter updates and the game resumes',state==='play'&&p.mag===12&&p.reserve===36);
 p.mag=5;p.reserve=20;reload();t('ordinary reload cannot bypass the tuple',state==='pyr'&&PR.reason==='violation'&&p.mag===5&&p.rel===0);
 PR.exec('ammo = (999, 999)');t('cheating with a huge tuple is rejected',!!PR.check().err);PR.exec('ammo = (12, 13)');PR.commit();t('after fixing, play resumes with the new ammo',state==='play'&&p.mag===12);
 // --- every other weapon ---
 SAVE.guns.owned=['pistol','smg','shotgun','rifle','sniper'];newLevel(1);state='play';
 const opens=id=>{equipGun(id);G.p.mag=0;G.p.reserve=60;state='play';PR.open('manual');return G.p};
 let q=opens('smg');t('LIST: opens as a list',PR.env.ammo.t==='list');t('LIST: set has no add()',!PR.exec('ammo.add(1)')&&/AttributeError/.test(PR.err));
 PR.exec('ammo = tuple(ammo)');t('LIST: converting to a tuple breaks the weapon',/list/.test(PR.check().err));PR.exec('ammo = list(ammo)');
 PR.exec('ammo[0] = 30\\nammo[1] = ammo[1] - 30');t('LIST: in-place edit is valid',PR.check().mag===30&&PR.check().reserve===30);PR.commit();t('LIST: resumes',state==='play'&&q.mag===30);
 q=opens('shotgun');t('SET: shells is a set',PR.env.shells.t==='set');PR.exec('shells.add(1)\\nshells.add(1)');t('SET: duplicates add nothing',PR.env.shells.v.size===1);
 t('SET: item assignment is a TypeError',!PR.exec('shells[0] = 3')&&/TypeError/.test(PR.err));PR.exec('shells.add(2)\\nshells.add(3)\\nshells.add(4)\\nshells.add(5)\\nshells.add(6)');t('SET: six unique shells fill the magazine',PR.check().mag===6);
 PR.exec('shells.add(7)');t('SET: a seventh shell is rejected',/at most 6/.test(PR.check().err));PR.exec('shells.discard(7)');PR.commit();t('SET: resumes with 6 shells',state==='play'&&q.mag===6);
 q=opens('rifle');t('DICT: ammo is a dict',PR.env.ammo.t==='dict');t('DICT: attribute access is rejected',!PR.exec('x = ammo.mag')&&/AttributeError/.test(PR.err));
 PR.exec('ammo[0] = 5');t('DICT: a wrong key makes the weapon invalid',/only the keys/.test(PR.check().err));
 PR.env.ammo.v.delete(0);PR.exec('ammo["mag"] = 24\\nammo["reserve"] = ammo["reserve"] - 24');PR.commit();t('DICT: key edit resumes',state==='play'&&q.mag===24&&q.reserve===36);
 q=opens('sniper');t('RANGE: ammo is a range',PR.env.ammo.t==='range');t('RANGE: item assignment is a TypeError',!PR.exec('ammo[0] = 1')&&/range/.test(PR.err));
 PR.exec('ammo = range(5)');PR.commit();t('RANGE: a new range reloads',state==='play'&&q.mag===5);
 equipGun('sniper');q.mag=2;q.reserve=10;reload();t('RANGE: immutable weapon also rejects R',state==='pyr'&&PR.reason==='violation');PR.exec('ammo = range(5)');PR.commit();
 // --- 30-round tuple gun, repeated every time it runs dry ---
 SAVE.guns.owned=['pistol','smg','shotgun','rifle','sniper'];SAVE.guns.sel='pistol';newLevel(1);state='play';
 t('only the tuple gun changed to 30; other guns keep their size',[WEAPONS.pistol.mag,WEAPONS.smg.mag,WEAPONS.shotgun.mag,WEAPONS.rifle.mag,WEAPONS.sniper.mag].join()==='30,30,6,24,5');
 t('a new game starts with a full 30-round tuple magazine',G.p.gun==='pistol'&&G.p.mag===30&&WEAPONS.pistol.mag===30);
 for(let c=1;c<=3;c++){const pp=G.p;let paused=false;for(let i=1;i<=30;i++){pp.cd=0;G.bul.length=0;shoot();if(i<30&&state!=='play')paused=true}
  t('cycle '+c+': 30 shots fired before the tuple console opens',!paused&&state==='pyr'&&pp.mag===0);
  const add=RULES.pistol.guided(PR.env,PR.base)[1][1];PR.exec('ammo = list(ammo)');PR.exec(add);PR.exec('ammo = tuple(ammo)');
  t('cycle '+c+': the rearm gives another full 30',PR.check().mag===30);PR.commit();t('cycle '+c+': play resumes with 30/30',state==='play'&&pp.mag===30)}
 t('tuple rules still apply at 30 (direct edit rejected)',(()=>{G.p.mag=0;G.p.cd=0;state='play';PR.open('empty');const r=!PR.exec('ammo[0] = 30')&&/TypeError/.test(PR.err);PR.exec('ammo = list(ammo)');PR.exec('ammo[0] = 31');const big=!!PR.check().err;PR.exec('ammo[0] = 30');PR.exec('ammo = tuple(ammo)');PR.commit();return r&&big&&state==='play'&&G.p.mag===30})());
 // --- bombs ---
 newLevel(1);state='play';const bp=G.p;t('player starts with more than two bombs',bp.bombs>2&&bp.bombs===CFG.bombs);
 const b0=bp.bombs;throwBomb();throwBomb();t('each bomb thrown uses exactly one',bp.bombs===b0-2);bp.bombs=0;const nb=G.bombs.length;throwBomb();t('no bomb is thrown at zero',G.bombs.length===nb&&bp.bombs===0);
 // --- lesson indentation ---
 t('correct if/else passes',pySyntax('if ammo == 0:\\n    print("reload")\\nelse:\\n    print("shoot")')==='');
 t('unindented body is rejected',/Indentation error/.test(pySyntax('if ammo == 0:\\nprint("reload")')));
 t('a plain statement needs no indentation',pySyntax('ammo = 12')==='');t('stray indent is rejected',/expected 0 leading spaces/.test(pySyntax('  ammo = 12')));
 t('else without if is rejected',/Syntax error/.test(pySyntax('print(1)\\nelse:\\n    print(2)')));t('missing colon is rejected',/colon/.test(pySyntax('if ammo == 0\\n    print(1)')));
 t('loops, functions and classes are checked',/Indentation/.test(pySyntax('for i in range(3):\\nprint(i)'))&&/Indentation/.test(pySyntax('def strike(p):\\nreturn p'))&&/Indentation/.test(pySyntax('class A:\\ndef f(self):\\n    pass')));
 t('every accepted lesson solution is valid Python layout',CH.every(c=>pySyntax(c.sol)===''));
 t('one-line block is allowed',pySyntax('for i in range(3): print(i)')==='');
 this.out=out}).call(this);`;
vm.runInContext(code, ctx);
let fails = 0; ctx.out.forEach(([n, ok]) => { if (!ok) { fails++; console.log('FAIL', n); } });
console.log(fails ? fails + ' check(s) failed' : 'All ' + ctx.out.length + ' Python rule checks passed'); process.exit(fails ? 1 : 0);
