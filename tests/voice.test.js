// Run with: node tests/voice.test.js
// Female voice feedback with a fake speech synthesis: real-event phrases, cooldowns, priority, no queue, settings, mute, cancel, unsupported browsers.
const fs = require('fs'), vm = require('vm'), path = require('path'), spoken = []; let speaking = false, cancels = 0, now = 1e6;
const synth = { speaking: false, pending: false, getVoices: () => [{ name: 'Microsoft David', lang: 'en-US' }, { name: 'Google UK English Female', lang: 'en-GB' }, { name: 'Anna', lang: 'de-DE' }], speak(u) { spoken.push(u); this.speaking = true; u.onstart && u.onstart(); }, cancel() { cancels++; this.speaking = false; } };
const done = () => { synth.speaking = false; const u = spoken[spoken.length - 1]; u && u.onend && u.onend(); };
function make(withSynth) { const ctx = { SAVE: { mute: false, voice: true, vol: { m: .7, s: .8, v: .6 } }, Music: { duck: 1 }, store() {}, mix() {}, document: { createElement: () => ({ setAttribute() {}, appendChild() {} }) }, console, Date: { now: () => now } };
  ctx.window = ctx; if (withSynth) { ctx.speechSynthesis = synth; ctx.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } }; } vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'voice.js'), 'utf8') + ';this.Voice=Voice;', ctx); return ctx; }
let fails = 0; const t = (n, c) => { if (!c) { fails++; console.log('FAIL', n); } }, last = () => spoken[spoken.length - 1] && spoken[spoken.length - 1].text, tick = ms => { now += ms; };
const c = make(true), V = c.Voice;
t('the female English voice is chosen (not the male or the German one)', V.pick().name === 'Google UK English Female');
V.event('welcome'); t('welcome is spoken', last() === 'Welcome to GHOST CTS3.' && spoken[0].voice.name.includes('Female') && Math.abs(spoken[0].volume - .6) < 1e-9);
t('music ducks while she speaks', c.Music.duck < 1); done(); t('and returns to normal afterwards', c.Music.duck === 1);
V.event('welcome'); tick(1e9); t('welcome is only said once per visit', spoken.length === 1);
tick(5000); V.event('start', { lvl: 1 }); t('level 1 start phrase', last() === 'Stay alert. Your mission starts now.'); done();
tick(4000); V.event('kill', { combo: 1 }); t('first kill: Good shot', last() === 'Good shot.'); done();
tick(4000); const n = spoken.length; V.event('kill', { combo: 1 }); t('the same praise is not repeated within its cooldown', spoken.length === n);
tick(4000); V.event('kill', { combo: 2 }); t('two confirmed kills: two targets down', last() === 'Nice work. Two targets down.'); done();
tick(4000); V.event('kill', { combo: 3 }); t('three confirmed kills: three targets down', last() === 'Excellent. Three targets down.'); done();
tick(1000); const m = spoken.length; V.event('progress'); t('routine praise keeps a global gap (no chatter)', spoken.length === m);
tick(5000); V.event('lowammo'); done(); const k = spoken.length; V.event('lowammo'); t('a warning is not repeated until the situation changes', spoken.length === k);
tick(5000); V.event('reload'); t('reload hint', last() === "Reload when it's safe."); /* still speaking */
V.event('critical'); t('urgent warnings interrupt routine speech (and nothing is queued)', last() === 'Careful. Your health is critically low.' && cancels >= 1 && !synth.pending); done();
tick(5000); V.event('lowhp'); t('low health warning', last() === 'Careful. Your health is getting low.'); const j = spoken.length; V.event('kill', { combo: 1 }); t('routine speech never interrupts a warning', spoken.length === j); done();
tick(5000); V.event('lesson'); t('first lesson: explains what to do', /read the task carefully/i.test(last())); done(); tick(70000); V.event('lesson'); t('later lessons: short encouragement', last() === 'Take your time. You can do this.'); done();
tick(11000); V.event('wrong'); const w1 = last(); done(); tick(11000); V.event('wrong'); t('mistakes get different gentle replies', w1 !== last() && /try again|instructions|learning/i.test(w1)); done();
tick(11000); V.event('solved'); t('solved challenge', /Excellent work|Well done/.test(last())); done();
tick(11000); V.event('pause'); t('pause', last() === 'Game paused.'); done(); tick(6000); V.event('resume'); t('resume', last() === 'Welcome back. Stay focused.'); done();
tick(4000); V.event('win'); t('mission complete', last() === 'Mission complete. Excellent work.'); done(); tick(4000); V.event('lose'); t('mission failed', last() === 'Mission failed. Rest, regroup, and try again.'); done();
c.SAVE.voice = false; tick(100000); const q = spoken.length; V.event('kill', { combo: 2 }); t('voice OFF: silent (on-screen messages are unaffected)', spoken.length === q); c.SAVE.voice = true;
c.SAVE.mute = true; V.event('kill', { combo: 2 }); t('mute silences the voice too', spoken.length === q); c.SAVE.mute = false;
V.event('kill', { combo: 2 }); const cc = cancels; V.cancel(); t('cancel stops speech and restores the music level', cancels === cc + 1 && c.Music.duck === 1);
t('unknown events say nothing', V.event('nonsense') === false);
const bare = make(false); t('browsers without speech synthesis: no errors and no voice', bare.Voice.ok === false && bare.Voice.event('kill', { combo: 2 }) === false && (bare.Voice.cancel(), true));
console.log(fails ? fails + ' check(s) failed' : 'All voice checks passed'); process.exit(fails ? 1 : 0);
