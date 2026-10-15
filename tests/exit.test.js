// Optional real-browser test (Playwright + Chromium): exit game, confirm dialog, reset progress, tips, voice announcements, audio settings, double-tap guard.
let chromium; try { chromium = require('playwright').chromium; } catch (e) { try { chromium = require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; } catch (e2) { console.log('Playwright not installed - skipping'); process.exit(0); } }
const url = 'file://' + require('path').join(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }), res = [], t = (n, c) => res.push([n, !!c]), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1104, height: 625 } });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} });
  await ctx.addInitScript(() => { window.__sp = []; window.__spc = 0; window.__lc = 0; window.__pf = 0; window.__raf = 0; window.__iv = new Set();
    const stub = { speaking: false, pending: false, getVoices: () => [{ name: 'Samantha', lang: 'en-US' }], speak(u) { window.__sp.push(u.text); }, cancel() { window.__spc++; }, onvoiceschanged: null };
    Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true }); window.SpeechSynthesisUtterance = function (tx) { this.text = tx; };
    const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => { window.__raf++; return raf(f); };
    const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window); window.setInterval = (f, ms, ...a) => { const id = si(f, ms, ...a); window.__iv.add(id); return id; }; window.clearInterval = id => { window.__iv.delete(id); return ci(id); }; });
  const pg = await ctx.newPage(); pg.setDefaultTimeout(6000); pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss());
  const ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms), click = async s => { await pg.click(s); await wait(300); };
  await pg.goto(url); await wait(500); await pg.click('#boot', { force: true }); await ev(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await wait(1400);
  t('menu shows EXIT GAME and the audio settings', await ev(() => !!document.getElementById('exitb').offsetParent && document.querySelectorAll('#audMenu input[type=range]').length === 3 && /VOICE: ON/.test(document.querySelector('#audMenu .vb').textContent)));
  t('welcome is spoken once when the player enters', await ev(() => window.__sp.filter(x => /Welcome to GHOST CTS3/.test(x)).length === 1));
  t('exactly one music scheduler is running', await ev(() => Music.on && window.__iv.size === 1));
  // ---- exit from the menu: confirm, cancel, confirm
  await click('#exitb'); t('EXIT GAME asks for confirmation first', await ev(() => state === 'cfm' && document.getElementById('cfm').classList.contains('on') && /Leave the game/.test(document.getElementById('cfmM').textContent)));
  await pg.keyboard.press('Escape'); await wait(200); t('Escape cancels and the menu is back', await ev(() => state === 'menu' && document.getElementById('menu').classList.contains('on')));
  await click('#exitb'); await click('#cfmNo'); t('CANCEL keeps the game', await ev(() => state === 'menu'));
  await click('#exitb'); await click('#cfmYes'); await wait(700);
  t('GAME EXITED screen is shown with a way back', await ev(() => state === 'exited' && document.getElementById('exit').classList.contains('on') && /GAME EXITED/.test(document.getElementById('exit').textContent) && !!document.getElementById('exitBack').offsetParent));
  t('exit stopped music, timers and the audio context', await ev(() => !Music.on && window.__iv.size === 0 && AC.state === 'suspended'));
  await ev(() => { window.__lc = 0; }); await wait(600); t('no game loop keeps running after exit', (await ev(() => window.__lc)) === 0);
  const loopRatio = async () => { await ev(() => { if (!window.__lcInit) { window.__lcInit = 1; const o = loop; window.loop = function (t) { window.__lc++; return o(t); }; (function p() { window.__pf++; requestAnimationFrame(p); })(); } window.__lc = 0; window.__pf = 0; }); await wait(1000); return ev(() => window.__lc / Math.max(1, window.__pf)); };
  await click('#exitBack'); await wait(500);
  t('return to the main menu works without a refresh', await ev(() => state === 'menu' && document.getElementById('menu').classList.contains('on')));
  const lr = await loopRatio(); t('after returning: exactly one game loop (' + lr.toFixed(2) + ' loop calls per frame), one music scheduler, music back', lr < 1.35 && lr > .5 && await ev(() => Music.on && window.__iv.size === 1 && AC.state === 'running'));
  // ---- exit from a running game: progress saved, everything stopped
  await ev(() => { SAVE.credits = 777; store(); }); await click('#play'); await click('#eb'); await wait(500);
  t('level start is announced by the voice (first level wording)', await ev(() => window.__sp.some(x => /Your mission starts now/.test(x))));
  await wait(900); t('a first-time tip explains the objective and controls', await ev(() => document.getElementById('tip').classList.contains('on') && /Defeat every enemy/.test(document.getElementById('tipT').textContent)));
  await click('#tipX'); t('the tip can be dismissed', await ev(() => !document.getElementById('tip').classList.contains('on')));
  await wait(3700);   // routine praise keeps a 3.5 s gap after the level-start line
  await ev(() => { G.p.hp = 9999; }); const sp0 = await ev(() => window.__sp.length); await ev(() => { const e = mk('grunt', 300, 300); G.enemies.push(e); hurt(e, 9999); }); t('a real kill is announced once', await pg.evaluate(n => window.__sp.slice(n).filter(x => /Good shot/.test(x)).length === 1, sp0));
  await ev(() => { const e = mk('grunt', 300, 300); G.enemies.push(e); hurt(e, 9999); }); t('and not repeated straight away', await pg.evaluate(n => window.__sp.slice(n).filter(x => /Good shot/.test(x)).length === 1, sp0));
  await ev(() => { G.p.hp = 20; G.p.hurt = 0; hurtPlayer(1); }); t('low health: on-screen message AND voice', await ev(() => /HEALTH LOW/.test(document.getElementById('msg').textContent) && window.__sp.some(x => /health is getting low/.test(x))));
  t('low health raises the music tension', await ev(() => { Music.sync(); return Music.danger === true; }));
  await ev(() => { G.p.hp = 100; }); await click('#pbtn'); t('pausing says so and shows EXIT GAME + audio controls', await ev(() => window.__sp.some(x => /Game paused/.test(x)) && !!document.getElementById('pexit').offsetParent && document.querySelectorAll('#audPause input').length === 3));
  await click('#pexit'); await click('#cfmNo'); t('cancel returns to the pause menu', await ev(() => state === 'pause' && document.getElementById('pause').classList.contains('on')));
  const px = await ev(() => G.enemies.map(e => Math.round(e.x)).join()); await wait(500); t('the world stays frozen behind the dialog', px === await ev(() => G.enemies.map(e => Math.round(e.x)).join()));
  const cancels0 = await ev(() => window.__spc); await click('#pexit'); await click('#cfmYes'); await wait(700);
  t('exit from a game: stopped, cleared, progress saved', await ev(() => state === 'exited' && G === null && JSON.parse(localStorage.getItem('ghost')).credits >= 777 && !Music.on && window.__iv.size === 0));
  t('speech was cancelled on exit', (await ev(() => window.__spc)) > cancels0);
  await click('#exitBack'); t('and the game can be played again', await ev(() => state === 'menu')); await click('#play'); await click('#eb'); t('a new game starts cleanly', await ev(() => state === 'play' && G && G.enemies.length >= 0));
  // ---- reset progress works even though browser dialogs are blocked
  await ev(() => { cur = null; pausedFrom = null; toMenu(); SAVE.lvl = 4; SAVE.credits = 900; SAVE.name = 'NOVA'; SAVE.guns.owned.push('smg'); store(); }); await click('#reset');
  t('Reset asks first (in-page dialog)', await ev(() => state === 'cfm' && /RESET PROGRESS/.test(document.getElementById('cfmT').textContent)));
  await click('#cfmNo'); t('cancelling keeps the progress', await ev(() => SAVE.lvl === 4 && SAVE.credits === 900));
  await click('#reset'); await click('#cfmYes'); t('confirming erases progress but keeps settings and codename', await ev(() => SAVE.lvl === 1 && SAVE.credits === 200 && SAVE.guns.owned.length === 1 && SAVE.name === 'NOVA' && state === 'menu' && JSON.parse(localStorage.getItem('ghost')).lvl === 1));
  // ---- audio settings and voice switch
  await ev(() => { const r = document.querySelector('#audMenu input'); r.value = 0; r.dispatchEvent(new Event('input')); }); t('music volume slider is applied and saved', await ev(() => SAVE.vol.m === 0 && JSON.parse(localStorage.getItem('ghost')).vol.m === 0));
  const n0 = await ev(() => window.__sp.length); await click('#audMenu .vb'); t('voice switch turns the voice off', await ev(() => SAVE.voice === false && /VOICE: OFF/.test(document.querySelector('#audMenu .vb').textContent)));
  await click('#play'); await click('#eb'); await wait(300); t('with the voice off nothing is spoken (on-screen messages remain)', await pg.evaluate(n => window.__sp.length === n, n0));
  // ---- lessons + double tap guard + tips persistence
  await ev(() => { toMenu(); }); await click('#train'); t('practice mode explains where to type', await ev(() => /type your code in the green box/.test(document.getElementById('cguide').textContent) && !!document.getElementById('cguide').offsetParent));
  await pg.dblclick('#cnext'); await wait(300); t('a double tap activates NEXT QUEST only once', await ev(() => cur && cur.i === 1));
  await ev(() => { cur = null; toMenu(); }); await pg.reload(); await wait(600); await ev(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await wait(1300); await pg.click('#play'); await pg.click('#eb'); await wait(1800);
  t('tips are remembered: the movement tip is not shown again after a reload', await ev(() => !document.getElementById('tip').classList.contains('on') && SAVE.tips.move === 1));
  t('no JavaScript errors', errs.length === 0 || (console.log(errs.slice(0, 4)), false));
  let f = 0; res.forEach(([n, ok]) => { if (!ok) { f++; console.log('FAIL', n); } }); console.log(f ? f + ' of ' + res.length + ' checks failed' : 'All ' + res.length + ' exit/voice/tips browser checks passed'); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.log('EXIT TEST ERROR:', e.message.split('\n').slice(0, 6).join(' | ')); process.exit(1); });
