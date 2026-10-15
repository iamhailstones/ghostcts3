// Run with: node tests/music.test.js
// Cinematic music + mixer, driven with a fake Web Audio API: moods follow the game state, one scheduler only, stingers, mute, stop/restart, no clipping chain.
const fs = require('fs'), vm = require('vm'), path = require('path'); let notes = 0, intervals = 0, cleared = 0, compressors = 0;
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
const node = () => ({ type: '', frequency: param(), gain: param(), delayTime: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {}, start() { notes++; }, stop() {} });
class FakeAC { constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = {}; } resume() {} suspend() { this.state = 'suspended'; }
  createOscillator() { return node(); } createGain() { return node(); } createBiquadFilter() { return node(); } createDelay() { return node(); } createDynamicsCompressor() { compressors++; return node(); } createBuffer() { return { getChannelData: () => new Float32Array(8) }; } createBufferSource() { return node(); } }
const ctx = { SAVE: { mute: false, vol: { m: .7, s: .8, v: .9 } }, state: 'menu', G: null, store() {}, msg() {}, document: { hidden: false }, setInterval: () => (intervals++, 7), clearInterval: () => cleared++, setTimeout: f => 0, console };
ctx.window = ctx; ctx.AudioContext = FakeAC; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8') + ';this.Music=Music;this.acx=acx;this.sfx=sfx;this.BUSf=()=>BUS;this.mix=mix;', ctx);
const M = ctx.Music; let fails = 0; const t = (n, c) => { if (!c) { fails++; console.log('FAIL', n); } };
const run = s => { for (let x = 0; x < s; x += .09) { ctx.acx().currentTime += .09; M.sync(); M.pump(); } };
M.start(); M.start(); M.start(); t('starting repeatedly creates only one scheduler (no overlapping music)', intervals === 1);
run(10); t('menu: piano, strings and drone are scheduled', notes > 8 && M.mood === 'menu');
t('the mixer has a compressor between the buses and the speakers (no clipping)', compressors === 1 && !!ctx.BUSf().comp);
const menuBpm = M.bpm; ctx.state = 'play'; ctx.G = { lvl: 3, boss: null, p: { hp: 100 } }; run(1); t('gameplay is a calmer, quieter mood', M.mood === 'play' && !M.danger);
ctx.G.p.hp = 20; run(1); t('low health raises tension (danger layer)', M.danger === true);
ctx.G.p.hp = 100; ctx.G.boss = {}; run(1); t('boss mood is the most intense', M.mood === 'boss' && M.bpm > menuBpm);
ctx.G.boss = null; ctx.state = 'end'; run(1); t('between levels the music ducks', M.mood === 'duck');
const before = notes; M.stinger('win'); t('mission complete plays a resolution (piano + strings) and holds', notes - before >= 7 && M.hold > ctx.acx().currentTime);
run(.2); t('the hold mood is used right after a stinger', M.mood === 'hold');
ctx.acx().currentTime += 12; M.stinger('lose'); t('game over plays a slow piano theme', M.hold > ctx.acx().currentTime + 8);
ctx.acx().currentTime += 12; ctx.state = 'menu'; ctx.G = null; run(1); t('music returns to the menu mood after the hold', M.mood === 'menu');
ctx.SAVE.mute = true; const n0 = notes; run(3); t('silent when muted', notes === n0); ctx.SAVE.mute = false;
M.stop(); t('stop clears the scheduler and music flag', M.on === false && cleared >= 1); const n1 = notes; run(2); t('nothing is scheduled after stop', notes === n1);
M.restart(); t('restart resumes with exactly one new scheduler', M.on === true && intervals === 2);
ctx.sfx('shoot'); t('sound effects still work and go through the effects bus', notes > n1);
ctx.SAVE.vol.m = 0; ctx.mix(); t('volume settings are applied without error', true);
console.log(fails ? fails + ' check(s) failed' : 'All music checks passed'); process.exit(fails ? 1 : 0);
