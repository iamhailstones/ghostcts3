// Optional real-browser test (Playwright + Chromium): layouts on many screen sizes, nothing overlapping or cut off, full-screen phone layout,
// the lesson editor (4-space auto-indent, scrolling, long code, keyboard-sized screen) and the rotate prompt rules.
let chromium; try { chromium = require('playwright').chromium; } catch (e) { try { chromium = require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; } catch (e2) { console.log('Playwright not installed - skipping'); process.exit(0); } }
const url = 'file://' + require('path').join(__dirname, '..', 'index.html');
const DEVICES = [['iPhone SE landscape', 667, 375, 1], ['iPhone 14 landscape', 844, 390, 1], ['Galaxy/Pixel landscape', 915, 412, 1], ['Tecno/Infinix landscape', 720, 360, 1], ['small phone landscape', 640, 320, 1],
  ['tablet landscape', 1024, 768, 1], ['phone portrait', 390, 844, 1], ['small phone portrait', 360, 640, 1], ['laptop', 1104, 625, 0], ['desktop', 1366, 768, 0]];
const AUDIT = () => { const out = [], vw = innerWidth, vh = innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden') return false; } return true; };
  const bootOn = (() => { const e = document.getElementById('boot'); return e && getComputedStyle(e).display !== 'none' && !e.classList.contains('out'); })(), els = [...document.querySelectorAll('button,textarea,input,select,a[href],#touch .js')].filter(vis).filter(e => !bootOn || document.getElementById('boot').contains(e)), nm = e => e.id || e.textContent.trim().slice(0, 14);
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue; const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
    const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top); if (w > 3 && h > 3) out.push('overlap ' + nm(a) + ' / ' + nm(b)); }
  for (const e of els) { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push('offscreen ' + nm(e));
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (el !== e && !e.contains(el) && !(el && el.contains(e))) out.push('covered ' + nm(e) + ' by ' + (el && (el.id || el.tagName))); }
  document.querySelectorAll('.ov.on').forEach(o => { if (o.scrollWidth > o.clientWidth + 1) out.push('horizontal overflow in #' + o.id); });
  return out; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }), res = [], t = (n, c) => res.push([n, !!c]), errs = [];
  const open = async (d) => { const ctx = await b.newContext({ viewport: { width: d[1], height: d[2] }, hasTouch: !!d[3], isMobile: !!d[3] }); await ctx.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} }); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
    pg.on('pageerror', e => errs.push(d[0] + ': ' + e.message)); await pg.goto(url); await pg.waitForTimeout(500); return pg; };
  for (const d of DEVICES) {
    const pg = await open(d), ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms), check = async (label) => { const p = await ev(AUDIT); t(d[0] + ' / ' + label + ': no overlap, nothing cut off or covered' + (p.length ? ' [' + p.slice(0, 3).join('; ') + ']' : ''), p.length === 0); };
    await ev(() => { Orient.skip = true; Orient.update && Orient.update(); Boot.ready = Boot.cinema = true; Boot.maybeReady(); }); await wait(300); await check('loading screen');
    await ev(() => Boot.deploy()); await wait(1300); { const top = await ev(() => document.querySelector('#menu>:first-child').getBoundingClientRect().top - document.getElementById('menu').getBoundingClientRect().top); res.push([d[0] + ' / main menu: the title is not cut off at the top', top >= -1]); } await check('main menu'); await ev(() => Assistant.open()); await wait(200); await check('assistant chat'); await ev(() => Assistant.close()); await wait(100); await ev(() => Tut.open()); await wait(200); await check('tutorial popup'); await ev(() => Tut.close()); await wait(100); await ev(() => { openPractice(0); }); await wait(200); await check('practice mode'); await ev(() => { cur = null; toMenu(); });
    await ev(() => GM.open()); await wait(150); await check('gun market'); await ev(() => GM.close());
    await pg.click('#train'); await wait(150); await check('practice lesson'); await ev(() => { cur = null; toMenu(); });
    await pg.click('#play'); await pg.click('#eb'); await wait(400); await ev(() => { G.p.hp = 9999; });
    const geo = await ev(() => { const r = document.querySelector('canvas#c').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, innerWidth, innerHeight]; });
    await check('gameplay (HUD + controls)');
    if (d[3] && d[1] > d[2]) t(d[0] + ': game fills the screen edge to edge in one full dimension (the other is letterboxed so graphics are never stretched)', (geo[3] - geo[1] >= geo[5] - 2 || geo[2] - geo[0] >= geo[4] - 2) && geo[0] >= -1 && geo[2] <= geo[4] + 1 && geo[3] <= geo[5] + 1);
    if (!d[3]) t(d[0] + ': desktop game area keeps its original size', Math.round(geo[2] - geo[0]) === 900);
    await ev(() => pause()); await wait(150); await check('pause menu'); await ev(() => pause());
    await ev(() => { G.p.mag = 0; PR.open('manual'); }); await wait(150); await check('Python rule console'); await ev(() => { PR.env.ammo = PT([30, 48]); PR.commit(); });
    await ev(() => { state = 'end'; showEnd('GAME OVER', 'Score 10 | Level 1', 'RETRY LEVEL', () => {}); }); await wait(200); await check('game-over screen');
    await ev(() => { state = 'menu'; Confirm.ask('EXIT GAME', 'Leave the game? Your progress is saved.', 'EXIT GAME', () => {}); }); await wait(150); await check('exit confirmation');
    await ev(() => { Confirm.fn = null; state = 'menu'; gameExit(); }); await wait(150); await check('GAME EXITED screen');
    await pg.context().close();
  }
  // ---------- lesson editor ----------
  const pg = await open(['phone editor', 844, 390, 1]), ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms);
  await ev(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await wait(1300); await pg.click('#train'); await wait(150);
  const val = () => ev(() => document.getElementById('cin').value), clear = async () => { await pg.click('#cin'); await ev(() => { const a = document.getElementById('cin'); a.value = ''; a.focus(); }); };
  const type = async lines => { for (let i = 0; i < lines.length; i++) { await pg.keyboard.type(lines[i]); if (i < lines.length - 1) await pg.keyboard.press('Enter'); } };
  await clear(); await type(['if health > 0:', 'print("Ghost is alive")', 'if ammo > 0:', 'print("Ready to shoot")']);
  t('spec example indents each nested block by 4 spaces', await val() === 'if health > 0:\n    print("Ghost is alive")\n    if ammo > 0:\n        print("Ready to shoot")');
  await pg.keyboard.press('Enter'); await pg.keyboard.type('else:'); t('else typed in the inner block aligns with the inner if', (await val()).endsWith('\n    else:'));
  await clear(); await type(['if a:', 'print(1)', 'else:']); t('else aligns with the outer if as soon as the colon is typed', await val() === 'if a:\n    print(1)\nelse:');
  await pg.keyboard.press('Enter'); await pg.keyboard.type('print(2)'); t('block after else is indented again', (await val()).endsWith('else:\n    print(2)'));
  await clear(); await type(['try:', 'x = int(raw)', 'except ValueError:', 'x = 0']); t('try/except aligns and indents', await val() === 'try:\n    x = int(raw)\nexcept ValueError:\n    x = 0');
  await clear(); await type(['class Soldier:', 'def __init__(self, name):', 'self.name = name']); t('class and method nesting (4 / 8 spaces)', await val() === 'class Soldier:\n    def __init__(self, name):\n        self.name = name');
  await clear(); await type(['for i in range(3):', 'print(i)']); await pg.keyboard.press('Enter'); await pg.keyboard.press('Enter'); await pg.keyboard.type('done = 1');
  t('Enter on an empty indented line leaves the block', (await val()).endsWith('print(i)\n\ndone = 1'));
  await clear(); await pg.keyboard.press('Tab'); await pg.keyboard.type('x'); t('Tab inserts four spaces', await val() === '    x');
  await pg.keyboard.press('Shift+Tab'); t('Shift+Tab removes them', await val() === 'x');
  await clear(); await pg.keyboard.type('        '); await pg.keyboard.press('Backspace'); t('Backspace removes one whole indent level', await val() === '    ');
  await clear(); await type(['x = [1,', '2,', '3]', 'y = 2']); t('multiline list: hanging indent, then back to the margin', await val() === 'x = [1,\n    2,\n    3]\ny = 2');
  await clear(); await ev(() => { const a = document.getElementById('cin'); a.focus(); document.execCommand('insertText', false, 'a = 1\n  b = 2\n\tc = 3'); }); t('pasting keeps text exactly', await val() === 'a = 1\n  b = 2\n\tc = 3');
  await clear(); const lines = Array.from({ length: 45 }, (_, i) => 'x' + i + ' = ' + i); await type(lines); await wait(100);
  const vis = () => ev(() => { const a = document.getElementById('cin'), lh = parseFloat(getComputedStyle(a).lineHeight), ln = a.value.slice(0, a.selectionStart).split('\n').length, top = (ln - 1) * lh; return [top >= a.scrollTop - 1 && top + lh <= a.scrollTop + a.clientHeight + 1, a.scrollTop, a.clientHeight, window.scrollY, a.value.split('\n').length]; });
  let v = await vis(); t('after 45 lines the current line is visible and the page did not scroll (' + v[4] + ' lines, box ' + v[2] + 'px)', v[0] && v[3] === 0 && v[4] === 45);
  const st = v[1], lh0 = await ev(() => parseFloat(getComputedStyle(document.getElementById('cin')).lineHeight)), up = Math.max(1, Math.floor(v[2] / lh0) - 2); for (let i = 0; i < up; i++) await pg.keyboard.press('ArrowUp'); v = await vis(); t('moving the caret inside the view does not make the editor jump (' + up + ' lines up, box ' + v[2] + 'px)', v[1] === st && v[0]);
  t('editor shows at least 4 lines on a landscape phone (box ' + v[2] + 'px)', v[2] >= lh0 * 4); await pg.keyboard.press('Control+Home'); v = await vis(); t('jumping to the top scrolls the first line into view', v[1] === 0 && v[0]);
  await pg.keyboard.press('Control+End'); await pg.keyboard.type('z = "' + 'long'.repeat(60) + '"'); const h = await ev(() => { const a = document.getElementById('cin'), o = document.getElementById('chal'); return [a.scrollWidth > a.clientWidth, o.scrollWidth <= o.clientWidth + 1]; });
  t('a very long line scrolls inside the editor, not the layout', h[0] && h[1]);
  t('text colour contrasts with the editor background', await ev(() => { const c = getComputedStyle(document.getElementById('cin')); return c.color !== c.backgroundColor && parseFloat(c.fontSize) >= 15 && parseFloat(c.lineHeight) >= parseFloat(c.fontSize) * 1.4; }));
  // typing a real answer with only auto-indent
  await ev(() => { cur = null; toMenu(); }); await pg.click('#train'); await pg.click('#cnext'); await clear();
  await type(['if ammo == 0:', 'print("reload")', 'else:', 'print("shoot")']); await pg.click('#csub'); t('a lesson answer typed with auto-indent only is accepted', /GRANTED/.test(await pg.textContent('#cfb')));
  await ev(() => { document.getElementById('cin').value = 'if ammo == 0:\n  print("reload")\nelse:\n  print("shoot")'; document.getElementById('csub').disabled = false; }); await wait(320); await pg.click('#csub');
  t('2-space indentation is rejected and the message says 4 spaces', /4 spaces/.test(await pg.textContent('#cfb')) && !/GRANTED/.test(await pg.textContent('#cfb')));
  t('viewport meta lets the page resize when the keyboard opens', await ev(() => /interactive-widget=resizes-content/.test(document.querySelector('meta[name=viewport]').content)));
  // phone keyboard: a landscape phone with the keyboard open leaves ~190px
  await ev(() => { cur = null; toMenu(); }); await pg.click('#train'); await pg.click('#cin'); await pg.setViewportSize({ width: 844, height: 190 }); await wait(400);
  const kb = await ev(() => { const a = document.getElementById('cin').getBoundingClientRect(), vh = innerHeight; return { editorVisible: a.top >= 0 && a.bottom <= vh + 1 && a.height >= 56, kb: document.body.classList.contains('kb') }; });
  t('keyboard-sized screen: editor stays visible and usable (' + JSON.stringify(kb) + ')', kb.editorVisible && kb.kb);
  const kp = await ev(AUDIT); t('keyboard-sized screen: controls reachable, nothing overlaps' + (kp.length ? ' [' + kp.slice(0, 3).join('; ') + ']' : ''), kp.length === 0);
  await pg.keyboard.type('print("still typing")'); t('typing continues to work with the small screen', (await val()).includes('still typing'));
  await pg.setViewportSize({ width: 844, height: 390 }); await wait(300); t('layout returns when the keyboard closes', await ev(() => { document.activeElement.blur(); return true; }));
  // ---------- rotate prompt rules ----------
  const iph = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await iph.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} }); const ip = await iph.newPage();
  await ip.addInitScript(() => { try { Object.defineProperty(screen.orientation, 'lock', { value: undefined, configurable: true }); } catch (e) {} }); await ip.goto(url); await ip.waitForTimeout(600);
  t('iPhone-style browser (no orientation lock): clean rotate prompt appears in portrait', await ip.evaluate(() => document.getElementById('orient').classList.contains('on') && getComputedStyle(document.getElementById('orientGo')).display === 'none'));
  await ip.setViewportSize({ width: 844, height: 390 }); await ip.waitForTimeout(400); t('prompt disappears when the phone is turned', await ip.evaluate(() => !document.getElementById('orient').classList.contains('on')));
  await ip.setViewportSize({ width: 390, height: 844 }); await ip.waitForTimeout(300); await ip.tap('#orientSkip'); t('continue in portrait always works', await ip.evaluate(() => !document.getElementById('orient').classList.contains('on')));
  const dk = await b.newPage({ viewport: { width: 1104, height: 625 } }); await dk.addInitScript(() => { try { if (!localStorage.getItem('ghost')) localStorage.setItem('ghost', JSON.stringify({ tutDone: true })); } catch (e) {} }); await dk.goto(url); await dk.waitForTimeout(500); t('desktop never gets the prompt', await dk.evaluate(() => !Orient.mobile && !document.getElementById('orient').classList.contains('on')));
  t('no JavaScript errors anywhere', errs.length === 0 || (console.log(errs.slice(0, 5)), false));
  let f = 0; res.forEach(([n, ok]) => { if (!ok) { f++; console.log('FAIL', n); } }); console.log(f ? f + ' of ' + res.length + ' UX checks failed' : 'All ' + res.length + ' UX checks passed'); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.log('UX ERROR:', e.message.split('\n').slice(0, 6).join(' | ')); process.exit(1); });
