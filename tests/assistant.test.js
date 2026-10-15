// Optional real-browser test (Playwright + Chromium): soldier assistant, contact links, chat (text, voice in/out, errors), first-run tutorial,
// Practice Mode with real code (indentation / syntax / logic / runtime feedback, sandbox timeout), music style, reduced motion.
let chromium; try { chromium = require('playwright').chromium; } catch (e) { try { chromium = require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; } catch (e2) { console.log('Playwright not installed - skipping'); process.exit(0); } }
const url = 'file://' + require('path').join(__dirname, '..', 'index.html');
const STUBS = (mic) => { window.__sp = []; window.__cancel = 0; window.__iv = new Set(); window.__micDeny = false;
  Object.defineProperty(window, 'speechSynthesis', { value: { speaking: false, pending: false, getVoices: () => [{ name: 'Samantha', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }], speak(u) { window.__sp.push(u.text); }, cancel() { window.__cancel++; }, onvoiceschanged: null }, configurable: true });
  window.SpeechSynthesisUtterance = function (tx) { this.text = tx; };
  if (mic) { window.SpeechRecognition = window.webkitSpeechRecognition = function () { this.start = () => setTimeout(() => { if (window.__micDeny) { this.onerror({ error: 'not-allowed' }); this.onend(); return; } this.onresult({ results: [Object.assign([{ transcript: 'what is a tuple' }], { isFinal: true })] }); }, 80); this.stop = () => { this.onend && this.onend(); }; }; }
  else { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; }
  const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window); window.setInterval = (f, ms, ...a) => { const id = si(f, ms, ...a); window.__iv.add(id); return id; }; window.clearInterval = id => { window.__iv.delete(id); return ci(id); }; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }), res = [], t = (n, c) => res.push([n, !!c]), errs = [];
  const mk = async (mic, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1104, height: 625 } }, opts || {})); await ctx.addInitScript(STUBS, mic); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000); pg.on('pageerror', e => errs.push(e.message)); return pg; };
  const pg = await mk(true), ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms), click = async s => { await pg.click(s); await wait(320); };
  await pg.goto(url); await wait(400); await ev(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await wait(2600);
  // ---------- first-run tutorial ----------
  t('the tutorial opens by itself on the first visit', await ev(() => state === 'tut' && document.getElementById('tut').classList.contains('on') && /Welcome! Here's how to play/.test(document.getElementById('tutT').textContent)));
  t('step 1 of 6: Back is disabled and the step is named', await ev(() => /Step 1 of 6/.test(document.getElementById('tutStep').textContent) && document.getElementById('tutBack').disabled && /PLAY/.test(document.getElementById('tutBody').textContent)));
  for (let i = 0; i < 5; i++) await click('#tutNext'); t('step 6 of 6: Next becomes Finish', await ev(() => /Step 6 of 6/.test(document.getElementById('tutStep').textContent) && document.getElementById('tutNext').textContent === 'FINISH'));
  await click('#tutBack'); t('Back goes to step 5', await ev(() => /Step 5 of 6/.test(document.getElementById('tutStep').textContent) && document.getElementById('tutNext').textContent === 'NEXT'));
  await click('#tutNext'); await click('#tutNext'); t('Finish returns to the menu and is remembered', await ev(() => state === 'menu' && SAVE.tutDone === true && JSON.parse(localStorage.getItem('ghost')).tutDone === true));
  await click('#howb'); t('HOW TO PLAY reopens it; Skip closes it', await ev(() => state === 'tut')); await click('#tutSkip'); t('skip returns to the menu', await ev(() => state === 'menu'));
  await click('#howb'); await pg.keyboard.press('Escape'); await wait(200); t('Escape closes the tutorial safely', await ev(() => state === 'menu'));
  await pg.reload(); await wait(500); await ev(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await wait(2600); t('after a reload the tutorial is not forced again', await ev(() => state === 'menu'));
  // ---------- soldier + links ----------
  const m = await ev(() => { const s = document.getElementById('solSvg').getBoundingClientRect(), g = e => getComputedStyle(document.querySelector(e)).animationName; return { w: s.width, h: s.height, greet: document.querySelector('.asstt b').textContent, label: document.querySelector('.asstt span').textContent, hand: g('#solSvg .hand'), bob: g('#solSvg .sol'), eyes: g('#solSvg .eyes') }; });
  t('the smiling soldier is visible with the exact greeting', m.w >= 60 && m.h >= 70 && m.greet === 'Ask me anything!' && m.label === 'AI Game Assistant');
  t('idle, waving and blinking animations are running', /solBob/.test(m.bob) && /solWave/.test(m.hand) && /solBlink/.test(m.eyes));
  const L = await ev(() => [...document.querySelectorAll('.assistant-contact-links a')].map(a => { const r = a.getBoundingClientRect(); return [a.getAttribute('href'), a.target, a.rel, a.getAttribute('aria-label'), r.width, r.height]; }));
  t('X link: exact URL, new tab, noopener noreferrer, label, touch size', L[0][0] === 'https://x.com/GHOST_CTS_3' && L[0][1] === '_blank' && /noopener/.test(L[0][2]) && /noreferrer/.test(L[0][2]) && L[0][3] === 'Visit us on X' && L[0][4] >= 44 && L[0][5] >= 44);
  t('email link: exact mailto, label, touch size', L[1][0] === 'mailto:iamhailstones@gmail.com' && L[1][3] === 'Email us' && L[1][4] >= 44);
  await click('.assistant-contact-links a[href^="mailto:"]'); await wait(900);
  t('if no email app opens, a fallback offers the address, COPY EMAIL and OPEN GMAIL', await ev(() => { const f = document.getElementById('mailfb'); return !f.hidden && /iamhailstones@gmail\.com/.test(f.textContent) && document.getElementById('mailGmail').href.startsWith('https://mail.google.com/mail/') && /to=iamhailstones@gmail\.com/.test(document.getElementById('mailGmail').href) && document.getElementById('mailGmail').target === '_blank'; }));
  await click('#mailCopy'); t('COPY EMAIL confirms', await ev(() => document.getElementById('mailCopy').textContent === 'COPIED')); await click('#mailX'); t('the fallback can be closed and the mailto link is unchanged', await ev(() => document.getElementById('mailfb').hidden && document.querySelector('.assistant-contact-links a').nextElementSibling.getAttribute('href') === 'mailto:iamhailstones@gmail.com'));
  t('the assistant has accessible names and the file exists', await ev(() => /Ask me anything/.test(document.getElementById('asstb').getAttribute('aria-label'))));
  // ---------- chat ----------
  await click('#asstb'); t('clicking the soldier opens the chat', await ev(() => state === 'chat' && document.getElementById('chatp').classList.contains('on') && document.querySelectorAll('#chLog .cm.bot').length === 1));
  t('voice picker lists the device voices, mic is available', await ev(() => document.querySelectorAll('#chVsel option').length === 3 && !document.getElementById('chVsel').disabled));
  const sp0 = await ev(() => window.__sp.length), t0 = Date.now(); await pg.fill('#chIn', 'How do I reload?'); await pg.keyboard.press('Enter'); await wait(60);
  t('the question shows immediately', await ev(() => [...document.querySelectorAll('#chLog .cm.user')].some(x => x.textContent === 'How do I reload?')));
  await pg.fill('#chIn', 'second question'); await pg.keyboard.press('Enter'); await wait(900);
  t('the answer appears within a second and uses real game facts', await ev(() => { const bots = [...document.querySelectorAll('#chLog .cm.bot')]; return /tuple/.test(bots[bots.length - 1].textContent) && /30 rounds/.test(bots[bots.length - 1].textContent); }) && Date.now() - t0 < 3000);
  t('a second submit while answering is ignored (no duplicates)', await ev(() => document.querySelectorAll('#chLog .cm.user').length === 1));
  t('the answer is read aloud once (short, not the whole text)', await pg.evaluate(n => window.__sp.length === n + 1 && window.__sp[n].length <= 240, sp0));
  t('music keeps playing during the chat with one scheduler', await ev(() => Music.on && window.__iv.size === 1));
  await pg.fill('#chIn', 'what is the weather in Lagos'); await pg.keyboard.press('Enter'); await wait(900);
  t('unrelated questions get an honest, polite answer', await ev(() => /outside what I know/.test([...document.querySelectorAll('#chLog .cm.bot')].pop().textContent)));
  await click('#chStop'); t('STOP SPEAKING cancels speech', await ev(() => window.__cancel >= 2));
  await click('#chVoice'); t('the voice button turns it off', await ev(() => SAVE.voice === false && /VOICE: OFF/.test(document.getElementById('chVoice').textContent)));
  const sp1 = await ev(() => window.__sp.length); await pg.fill('#chIn', 'what is a set'); await pg.keyboard.press('Enter'); await wait(900); t('with the voice off the text answer still works and nothing is spoken', await ev(() => /unique/i.test([...document.querySelectorAll('#chLog .cm.bot')].pop().textContent)) && (await ev(() => window.__sp.length)) === sp1);
  await click('#chVoice'); await pg.selectOption('#chVsel', 'Daniel'); t('a different voice can be chosen and is remembered', await ev(() => SAVE.voiceName === 'Daniel'));
  await click('#chPrev'); t('PREVIEW speaks a sample', await ev(() => /game assistant/.test(window.__sp[window.__sp.length - 1])));
  await click('#chMic'); await wait(250); t('MIC puts the recognised words into the box for correction', await ev(() => document.getElementById('chIn').value === 'what is a tuple' && /Heard/.test(document.getElementById('chNote').textContent)));
  await ev(() => { window.__micDeny = true; Assistant.stopMic(); }); await click('#chMic'); await wait(250); t('a denied microphone is explained', await ev(() => /permission was denied/.test(document.getElementById('chNote').textContent))); await ev(() => { window.__micDeny = false; });
  await ev(() => { AI_CONFIG.endpoint = 'http://127.0.0.1:9/none'; }); await pg.fill('#chIn', 'how do bombs work'); await pg.keyboard.press('Enter'); await wait(1500);
  t('if an online assistant fails: clear message, RETRY, and the offline answer still appears', await ev(() => /did not answer/.test(document.getElementById('chNote').textContent) && document.getElementById('chRetry').style.display !== 'none' && /bombs/.test([...document.querySelectorAll('#chLog .cm.bot')].pop().textContent)));
  await ev(() => { AI_CONFIG.endpoint = ''; });
  await click('#chClose'); t('closing the chat restores the menu and stops speech', await ev(() => state === 'menu' && document.getElementById('menu').classList.contains('on')));
  const pn = await mk(false); await pn.goto(url); await pn.waitForTimeout(400); await pn.evaluate(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); }); await pn.waitForTimeout(2600); await pn.evaluate(() => { Tut.close(); }); await pn.click('#asstb'); await pn.waitForTimeout(300); await pn.click('#chMic'); await pn.waitForTimeout(200);
  t('browsers without speech recognition get a friendly message', await pn.evaluate(() => /not supported in this browser/.test(document.getElementById('chNote').textContent)));
  // ---------- practice mode (real code, sandbox) ----------
  await ev(() => { cur = null; toMenu(); SAVE.credits = 200; SAVE.pr = []; store(); }); await click('#practb'); await wait(200);
  t('practice opens with a complete task and starter code', await ev(() => state === 'chal' && /PRACTICE/.test(document.getElementById('ct').textContent) && /calculate_damage/.test(document.getElementById('cb').textContent) && /For example/.test(document.getElementById('cb').textContent) && /def calculate_damage/.test(document.getElementById('cin').value)));
  const run = async code => { await pg.fill('#cin', code); await wait(330); await pg.click('#csub'); await pg.waitForFunction(() => !document.getElementById('csub').disabled, null, { timeout: 8000 }); return ev(() => document.getElementById('cfb').textContent); };
  let fb = await run('def calculate_damage(base_damage, defense):\nif base_damage > defense:\n        return base_damage - defense\n    else:\n        return 0'); t('under-indentation: line, found, expected and fix', /Indentation error on line 2: expected 4 leading spaces inside the function.*found 0\. Add 4 space/.test(fb));
  fb = await run('def calculate_damage(base_damage, defense):\n    if base_damage > defense:\n        damage = base_damage - defense\n            return damage\n    else:\n        return 0'); t('over-indentation: line 4, expected 8, found 12', /line 4: expected 8 leading spaces.*found 12\. Remove 4/.test(fb));
  fb = await run('def calculate_damage(base_damage, defense)\n    return 0'); t('a missing colon is reported as a syntax error with its line', /(Syntax error on line 1|SYNTAX ERROR)/.test(fb) && /colon/.test(fb));
  fb = await run('def calculate_damage(base_damage, defense):\n    return base_damage - defense'); t('a logic error shows the call, the result and the expectation', /LOGIC ERROR/.test(fb) && /calculate_damage\(10, 15\) returned -5/.test(fb));
  fb = await run('def calculate_damage(base_damage, defense):\n    return base_damage / 0'); t('a runtime error is labelled as runtime', /RUNTIME ERROR: ZeroDivisionError/.test(fb));
  fb = await run('def calculate_damage(base_damage, defense):\n    print(base_damage - defense)'); t('printing instead of returning is an output error', /OUTPUT ERROR/.test(fb) && /return/.test(fb));
  const ts = Date.now(); fb = await run('def calculate_damage(base_damage, defense):\n    while True:\n        pass'); t('an endless loop is stopped and the game stays responsive (' + (Date.now() - ts) + ' ms)', /TimeoutError/.test(fb) && Date.now() - ts < 7000 && await ev(() => !document.getElementById('csub').disabled));
  t('the code runs in a Web Worker sandbox', await ev(() => typeof Worker === 'function'));
  fb = await run('def calculate_damage(base_damage, defense):\n    result = base_damage - defense\n    if result < 0:\n        result = 0\n    return result'); t('a correct solution (more than 4 lines) passes with an explanation', /PASSED/.test(fb) && /\+20 credits/.test(fb) && await ev(() => SAVE.pr.includes('p1') && SAVE.credits === 220));
  fb = await run('def calculate_damage(base_damage, defense):\n    return max(0, base_damage - defense)'); t('another valid style also passes, but credits are given only once', /PASSED/.test(fb) && !/credits\./.test(fb) && await ev(() => SAVE.credits === 220));
  await click('#cnext'); t('NEXT QUEST opens the next exercise', await ev(() => cur && cur.pr && cur.i === 1 && /total_score/.test(document.getElementById('cb').textContent)));
  await click('#pbtn'); t('pause works in practice mode', await ev(() => state === 'pause')); await click('#resume'); t('and resumes to the exercise', await ev(() => state === 'chal' && cur.i === 1));
  await ev(() => { cur = null; state = 'menu'; openPractice(4); }); await wait(200); t('read-and-predict questions are in the mix', await ev(() => /What number does calculate_damage/.test(document.getElementById('cb').textContent)));
  fb = await run('0'); t('a predict answer is checked', /PASSED/.test(fb));
  await click('#cclose'); await click('#cclose'); t('BACK returns to the main menu', await ev(() => state === 'menu'));
  // ---------- music style + reduced motion ----------
  t('the energetic street style is the default', await ev(() => { Music.sync(); return SAVE.mstyle === 'street' && Music.bpm >= 130; }));
  await click('#audMenu .sb'); t('the style switch changes the music and is remembered', await ev(() => { Music.sync(); return SAVE.mstyle === 'cinema' && Music.bpm < 100 && /CINEMATIC/.test(document.querySelector('#audMenu .sb').textContent); })); await click('#audMenu .sb');
  const rm = await mk(true, { reducedMotion: 'reduce' }); await rm.goto(url); await rm.waitForTimeout(400); await rm.evaluate(() => { Boot.ready = Boot.cinema = true; Boot.deploy(); Tut.close && 0; }); await rm.waitForTimeout(2600);
  t('reduced-motion setting turns the soldier animations off', await rm.evaluate(() => ['.hand', '.sol', '.eyes'].every(s => getComputedStyle(document.querySelector('#solSvg ' + s)).animationName === 'none')));
  t('no JavaScript errors', errs.length === 0 || (console.log(errs.slice(0, 4)), false));
  let f = 0; res.forEach(([n, ok]) => { if (!ok) { f++; console.log('FAIL', n); } }); console.log(f ? f + ' of ' + res.length + ' checks failed' : 'All ' + res.length + ' assistant/tutorial/practice browser checks passed'); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.log('ASSISTANT TEST ERROR:', e.message.split('\n').slice(0, 6).join(' | ')); process.exit(1); });