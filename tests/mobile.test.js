// Optional real-browser test of the phone landscape mode (needs Playwright + Chromium). Run with: node tests/mobile.test.js
let chromium; try { chromium = require('playwright').chromium; } catch (e) { try { chromium = require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; } catch (e2) { console.log('Playwright not installed - skipping'); process.exit(0); } }
const url = 'file://' + require('path').join(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }), res = [], t = (n, c) => res.push([n, !!c]);
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); await phone.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} }); const  pg = await phone.newPage(), ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms);
  pg.setDefaultTimeout(6000); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await phone.addInitScript(() => { window.__c = []; Element.prototype.requestFullscreen = function () { window.__c.push('fullscreen'); return Promise.resolve(); };
    try { Object.defineProperty(screen.orientation, 'lock', { value: m => { window.__c.push('lock:' + m); return Promise.resolve(); }, configurable: true }); } catch (e) {} });
  await pg.goto(url); await wait(800);
  t('no prompt is shown while landscape can be locked', await ev(() => !document.getElementById('orient').classList.contains('on')));
  t('landscape is requested automatically at launch (fullscreen + lock)', await ev(() => window.__c.includes('fullscreen') && window.__c.includes('lock:landscape')));
  await pg.screenshot({ path: '/tmp/mob_portrait_boot.png' });
  await pg.setViewportSize({ width: 844, height: 390 }); await wait(500);
  await ev(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await wait(1300);
  await pg.screenshot({ path: '/tmp/mob_menu.png' });
  const fits = async n => { const r = await ev(() => { const g = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }; return { c: g('canvas#c'), jl: g('#jl'), jr: g('#jr'), tf: g('#tf'), tb: g('#tb'), tr: g('#tr'), tw: g('#tw'), pb: g('#pbtn'), vw: innerWidth, vh: innerHeight, sh: document.documentElement.scrollHeight }; });
    const inside = a => a && a[0] >= -1 && a[1] >= -1 && a[2] <= r.vw + 1 && a[3] <= r.vh + 1;
    t(n + ': game area fits the phone screen', inside(r.c) && r.sh <= r.vh + 2); t(n + ': joysticks, buttons and pause are on screen', ['jl', 'jr', 'tf', 'tb', 'tr', 'tw', 'pb'].every(k => inside(r[k]))); return r; };
  await fits('menu');
  await pg.tap('#play'); await pg.tap('#eb'); await wait(500); await ev(() => { G.p.hp = 9999; });
  t('game starts by touch', await ev(() => state === 'play')); await fits('gameplay'); await ev(() => { G.enemies.push(mk('grunt', 300, 200)); const f = document.getElementById('tf'); f.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true, cancelable: true })); }); await wait(120);
  t('holding FIRE shoots and auto-aims at the nearest enemy', await ev(() => { const e = G.enemies[G.enemies.length - 1]; return M.down === true && !!e && Math.hypot(M.x - e.x, M.y - e.y) < 30; }));
  await ev(() => { document.getElementById('tf').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true })); G.enemies.pop(); }); await wait(60);
  t('releasing FIRE stops shooting', await ev(() => M.down === false)); await pg.screenshot({ path: '/tmp/mob_game.png' });
  await ev(() => { G.p.mag = 1; G.p.cd = 0; shoot(); }); await wait(300); t('python console opens', await ev(() => state === 'pyr')); await pg.screenshot({ path: '/tmp/mob_console.png' });
  const box = await ev(() => { const r = document.getElementById('pyGo').getBoundingClientRect(); return [r.bottom, innerHeight]; }); t('console buttons reachable (scrollable overlay)', box[0] > 0);
  await ev(() => { PR.env.ammo = PT([30, 48]); PR.commit(); }); await wait(100);
  await pg.setViewportSize({ width: 390, height: 844 }); await wait(500);
  t('rotating to portrait never blocks the game (no prompt, still playable)', await ev(() => state === 'play'));
  // a browser that only allows fullscreen/lock after a tap: denied at launch, granted on the player's first tap
  const strict = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await strict.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} });
  await strict.addInitScript(() => { window.__c = []; const ok = n => navigator.userActivation.isActive ? (window.__c.push(n), Promise.resolve()) : (window.__c.push('denied:' + n), Promise.reject(new Error('needs a tap')));
    Element.prototype.requestFullscreen = function () { return ok('fullscreen'); }; try { Object.defineProperty(screen.orientation, 'lock', { value: m => ok('lock:' + m), configurable: true }); } catch (e) {} });
  const sp = await strict.newPage(); await sp.goto(url); await sp.waitForTimeout(800);
  t('without a tap the browser denies it and the game shows nothing extra', await sp.evaluate(() => window.__c.includes('denied:lock:landscape') && !window.__c.includes('lock:landscape') && !document.getElementById('orient').classList.contains('on')));
  await sp.tap('#boot'); await sp.waitForTimeout(500);
  t('the first tap turns on fullscreen + landscape lock automatically', await sp.evaluate(() => window.__c.includes('fullscreen') && window.__c.includes('lock:landscape')));
  const desk = await b.newPage({ viewport: { width: 1104, height: 625 } }); await desk.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} }); await desk.goto(url); await desk.waitForTimeout(800);
  t('desktop never requests landscape', await desk.evaluate(() => !Orient.mobile && !Orient.done && Orient.tries === 0));
  const cr = await desk.evaluate(() => { const r = document.querySelector('canvas#c').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }); t('desktop layout unchanged (same 900 x 601 game area as before the change)', cr[0] === 900 && cr[1] === 601);
  t('no page errors', errs.length === 0 || (console.log(errs), false));
  let f = 0; res.forEach(([n, ok]) => { if (!ok) { f++; console.log('FAIL', n); } }); console.log(f ? f + ' mobile check(s) failed' : 'All ' + res.length + ' mobile checks passed'); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.log('MOBILE ERROR:', e.message.split('\n').slice(0, 6).join(' | ')); process.exit(1); });
