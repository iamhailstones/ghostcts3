// Optional real-browser test (needs Playwright with Chromium). Run with: node tests/e2e.test.js
// Plays the game in a headless browser: tuple workflow, pause freezing, navigation without reloads, lesson indentation, loop count.
let chromium; try { chromium = require('playwright').chromium; } catch (e) { try { chromium = require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; } catch (e2) { console.log('Playwright not installed - skipping browser test'); process.exit(0); } }
const path = require('path'), url = 'file://' + path.join(__dirname, '..', 'index.html');
let PG;
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 1104, height: 625 } });
  const res = [], t = (n, c) => res.push([n, !!c]), ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms), errs = [];
  PG = pg; pg.setDefaultTimeout(6000); pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} });
  await pg.addInitScript(() => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => { window.__raf++; return o(f); }; window.__reloaded = false; window.addEventListener('beforeunload', () => { window.__reloaded = true; }); });
  await pg.goto(url); await ev(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await wait(1300);
  const startGame = async () => { await pg.click('#play'); await pg.click('#eb'); await wait(300); };
  await startGame(); t('game starts', await ev(() => state === 'play'));
  const snap = () => ev(() => JSON.stringify({ hp: G.p.hp, mag: G.p.mag, e: G.enemies.map(e => [Math.round(e.x), Math.round(e.y), Math.round(e.hp)]), b: G.bul.length, sc: score }));
  await wait(2500); await ev(() => { G.p.mag = 1; G.p.cd = 0; });
  await pg.mouse.move(700, 300); await pg.mouse.down(); await wait(400); await pg.mouse.up();
  t('last round pauses into the Python rule console', await ev(() => state === 'pyr' && document.getElementById('pyr').classList.contains('on')));
  const s1 = await snap(); await wait(800); t('enemies, health and ammo are frozen while the popup is open', s1 === await snap());
  await pg.click('#pyGuided button:has-text("ADD AMMO")'); t('editing the tuple shows a TypeError', /TypeError/.test(await pg.textContent('#pyErr')));
  t('resume is disabled while the weapon is invalid', await pg.isDisabled('#pyGo'));
  await pg.click('#pyGuided button:has-text("CONVERT TO LIST")'); await pg.click('#pyGuided button:has-text("ADD AMMO")'); await pg.click('#pyGuided button:has-text("CONVERT TO TUPLE")');
  await pg.screenshot({ path: '/tmp/e2e_console.png' });
  await pg.click('#pyGo'); await wait(300); t('weapon reloaded and game resumed', await ev(() => state === 'play' && G.p.mag === 30));
  await ev(() => { G.p.hp = 9999; G.p.mag = 30; G.p.reserve = 48; });
  const fired = await ev(() => { let early = false; for (let i = 1; i <= 30; i++) { G.p.cd = 0; shoot(); if (i < 30 && state !== 'play') early = true; } return [early, state, G.p.mag]; });
  t('30 shots are fired before the tuple console opens', !fired[0] && fired[1] === 'pyr' && fired[2] === 0);
  for (const b of ['CONVERT TO LIST', 'ADD AMMO', 'CONVERT TO TUPLE']) await pg.click('#pyGuided button:has-text("' + b + '")');
  await pg.click('#pyGo'); t('the rearm gives another full 30', await ev(() => state === 'play' && G.p.mag === 30));
  await ev(() => { G.p.mag = 5; });   // R on a full magazine just says MAGAZINE FULL, so use a partly empty one
  await pg.keyboard.press('KeyR'); await wait(100); t('R cannot bypass the tuple', await ev(() => state === 'pyr' && PR.reason === 'violation')); await wait(320); await pg.click('#pyGo');
  await pg.screenshot({ path: '/tmp/e2e_play.png' });
  await pg.click('#pbtn'); const s2 = await snap(); await wait(700); t('pause freezes the world', await ev(() => state === 'pause') && s2 === await snap());
  await pg.click('#resume'); t('resume returns to play', await ev(() => state === 'play'));
  const loopRatio = async () => { await ev(() => { if (!window.__lcInit) { window.__lcInit = 1; const o = loop; window.loop = function (t) { window.__lc++; return o(t); }; (function p() { window.__pf++; requestAnimationFrame(p); })(); } window.__lc = 0; window.__pf = 0; }); await wait(1000); return ev(() => window.__lc / Math.max(1, window.__pf)); };
  const r1 = await loopRatio();
  await pg.click('#pbtn'); await pg.click('#tomenu'); t('first Main Menu click asks for confirmation', await ev(() => state === 'pause')); await wait(320); await pg.click('#tomenu');
  t('Main Menu leaves the game and clears it', await ev(() => state === 'menu' && G === null));
  await startGame(); const r2 = await loopRatio(); t('starting again does not add game loops (loop calls per frame: ' + r1.toFixed(2) + ' then ' + r2.toFixed(2) + ')', r1 < 1.35 && r2 < 1.35);
  await pg.click('#pbtn'); await pg.click('#tomenu'); await wait(320); await pg.click('#tomenu');
  await pg.click('#train'); t('training opens a lesson', await ev(() => state === 'chal'));
  await pg.click('#pbtn'); t('pause works inside a lesson', await ev(() => state === 'pause')); await pg.click('#resume'); t('resume returns to the lesson', await ev(() => state === 'chal'));
  await pg.click('#cnext'); t('Next Quest opens the next lesson', await ev(() => cur && cur.i === 1));
  await pg.fill('#cin', 'if ammo == 0:\nprint("reload")\nelse:\nprint("shoot")'); await pg.click('#csub'); const bad = await pg.textContent('#cfb');
  t('bad indentation is rejected with an explanation', /Indentation error/.test(bad) && !/GRANTED/.test(bad));
  await pg.fill('#cin', 'if ammo == 0:\n    print("reload")\nelse:\n    print("shoot")'); await wait(320); await pg.click('#csub'); t('correct indentation is accepted', /GRANTED/.test(await pg.textContent('#cfb')));
  await pg.click('#cclose'); t('CONTINUE after a solved lesson moves to the next one', await ev(() => state === 'chal' && cur.i === 2));
  await wait(320); await pg.click('#cclose'); t('Back returns to the menu from an unsolved lesson', await ev(() => state === 'menu'));
  await pg.click('#train'); await pg.fill('#cin', 'remaining = ammo - used'); await pg.click('#csub'); t('a one-line answer needs no indentation', /GRANTED/.test(await pg.textContent('#cfb')));
  await pg.click('#cmenu'); t('Main Menu from a lesson works', await ev(() => state === 'menu'));
  t('no full page reload happened', !(await ev(() => window.__reloaded))); t('no page errors', errs.length === 0 || (console.log(errs), false));
  let f = 0; res.forEach(([n, ok]) => { if (!ok) { f++; console.log('FAIL', n); } }); console.log(f ? f + ' browser check(s) failed' : 'All ' + res.length + ' browser checks passed'); await b.close(); process.exit(f ? 1 : 0);
})().catch(async e => { try { console.log('state at failure:', JSON.stringify(await PG.evaluate(() => [state, pausedFrom, [...document.querySelectorAll('.ov.on')].map(x => x.id), G && G.p.hp]))); } catch (x) {} console.log('E2E ERROR:', e.message.split('\n').slice(0, 8).join(' | ')); process.exit(1); });
