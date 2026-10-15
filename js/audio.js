"use strict";
/* audio.js - sound effects + cinematic music, all synthesized in the browser (no audio files, nothing to download).
   One mixer: music bus + effects bus -> compressor (stops clipping) -> speakers. Volumes come from SAVE.vol (music / effects / voice).
   Music: dark, emotional piano, slow strings, deep drones and restrained percussion that follow the game state. */
let AC=null,BUS=null;
const TONES={shoot:[[520,160,.07,'square',.05]],boom:[[140,35,.4,'sawtooth',.18]],kill:[[300,700,.12,'triangle',.1]],hit:[[200,90,.15,'square',.1]],
 ok:[[523,784,.25,'sine',.12]],no:[[200,120,.25,'sawtooth',.1]],win:[[523,659,.15,'sine',.12],[784,1047,.3,'sine',.12]]};
function sfx(name){if(SAVE.mute)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
 (TONES[name]||[]).forEach((a,i)=>{const t=AC.currentTime+i*.14,o=AC.createOscillator(),g=AC.createGain();o.type=a[3];o.frequency.setValueAtTime(a[0],t);
  o.frequency.exponentialRampToValueAtTime(a[1],t+a[2]);g.gain.setValueAtTime(a[4],t);g.gain.exponentialRampToValueAtTime(.0001,t+a[2]);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+a[2])})}catch(e){}}
function acx(){AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}
function bus(){if(BUS)return BUS;const a=acx(),comp=a.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=20;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.25;
 const m=a.createGain(),s=a.createGain();m.connect(comp);s.connect(comp);comp.connect(a.destination);BUS={m,s,comp};mix();return BUS}
function mix(){if(!BUS||!AC)return;const v=SAVE.vol,t=AC.currentTime;BUS.m.gain.setTargetAtTime(v.m,t,.08);BUS.s.gain.setTargetAtTime(v.s,t,.08)}
function sfx(name){if(SAVE.mute)return;try{const a=acx(),out=bus().s;(TONES[name]||[]).forEach((n,i)=>{const t=a.currentTime+i*.14,o=a.createOscillator(),g=a.createGain();o.type=n[3];o.frequency.setValueAtTime(n[0],t);
  o.frequency.exponentialRampToValueAtTime(n[1],t+n[2]);g.gain.setValueAtTime(n[4],t);g.gain.exponentialRampToValueAtTime(.0001,t+n[2]);o.connect(g);g.connect(out);o.start(t);o.stop(t+n[2])})}catch(e){}}
function updSnd(){const b=$('sndb'),c=$('musb');if(b)b.textContent='SETTINGS: SOUND '+(SAVE.mute?'OFF':'ON');if(c)c.textContent='MUSIC: '+(SAVE.nomusic?'OFF':'ON')}
function toggleMute(){SAVE.mute=!SAVE.mute;store();updSnd();if(SAVE.mute&&typeof Voice!=='undefined')Voice.cancel();msg(SAVE.mute?'SOUND OFF':'SOUND ON')}
function toggleMusic(){SAVE.nomusic=!SAVE.nomusic;store();updSnd();msg(SAVE.nomusic?'MUSIC OFF':'MUSIC ON')}
const CHORDS=[[110,0,3,7],[98,0,4,7],[87.31,0,4,7],[82.41,0,4,7]];   // Am - G - F - E: dark, emotional, never fully resolved
const Music={on:false,step:0,nextT:0,bpm:66,mood:'menu',danger:false,hold:0,duck:1,master:null,fx:null,timer:0,
 start(){if(this.on)return;try{const a=acx();
   if(!this.master){this.master=a.createGain();this.master.gain.value=0;this.master.connect(bus().m);
    const dl=a.createDelay(1.5),fb=a.createGain(),lp=a.createBiquadFilter();dl.delayTime.value=.42;fb.gain.value=.42;lp.type='lowpass';lp.frequency.value=1800;
    dl.connect(lp);lp.connect(fb);fb.connect(dl);dl.connect(this.master);this.fx=a.createGain();this.fx.connect(this.master);this.fx.connect(dl);this.nb=a.createBuffer(1,Math.floor(a.sampleRate*.25),a.sampleRate);const nd=this.nb.getChannelData(0);for(let q=0;q<nd.length;q++)nd[q]=Math.random()*2-1}   // fx = soft echo "hall"
   this.on=true;this.nextT=a.currentTime+.1;this.timer=setInterval(()=>this.pump(),90)}catch(e){}},
 stop(){clearInterval(this.timer);this.timer=0;this.on=false;this.duck=1;try{this.master.gain.cancelScheduledValues(AC.currentTime);this.master.gain.setTargetAtTime(0,AC.currentTime,.08);setTimeout(()=>{if(!this.on&&AC&&AC.suspend)AC.suspend()},450)}catch(e){}},
 restart(){try{AC&&AC.resume&&AC.resume()}catch(e){}this.start()},
 /* mood follows the real game state: loading screen, menu, fighting, boss, danger (low health), or a short hold after a stinger */
 sync(){if(!this.on)return;const g=typeof G!=='undefined'?G:null,boot=typeof Boot!=='undefined'&&Boot.active,held=!!AC&&AC.currentTime<this.hold;
  this.mood=boot?'boot':held?'hold':state==='play'?(g&&g.boss?'boss':'play'):(state==='menu'||!g)?'menu':'duck';
  this.danger=!!(g&&g.p&&state==='play'&&g.p.hp<=30);
  const lv=g?g.lvl:1;this.bpm=SAVE.mstyle==='cinema'?(this.mood==='boss'?92:this.mood==='play'?72+lv:(this.mood==='boot'||this.mood==='hold')?62:66):(this.mood==='boss'?152:this.mood==='play'?138+lv:this.mood==='boot'?120:this.mood==='hold'?100:this.mood==='duck'?130:138)},
 pump(){if(!this.on)return;const a=AC,hid=typeof document!=='undefined'&&document.hidden,
  vol=(SAVE.mute||SAVE.nomusic||hid)?0:(SAVE.mstyle==='cinema'?{boot:.5,menu:.62,hold:.42,play:.4,boss:.6,duck:.22}:{boot:.4,menu:.55,hold:.35,play:.5,boss:.62,duck:.25})[this.mood]||.4*(this.danger?1.15:1)*this.duck;
  this.master.gain.setTargetAtTime(vol*.5,a.currentTime,.5);if(!vol)return;                    // slow time constant = smooth fades, no sudden jumps
  if(this.nextT<a.currentTime)this.nextT=a.currentTime+.05;
  while(this.nextT<a.currentTime+.35){this.beat(this.step,this.nextT);this.nextT+=60/this.bpm/4;this.step=(this.step+1)%128}},
 beat(s,t){return SAVE.mstyle==='cinema'?this.beatCinema(s,t):this.beatStreet(s,t)},
 beatCinema(s,t){const bar=s>>4,i=s&15,ch=CHORDS[(bar>>1)&3],r=ch[0],m=this.mood,bl=60/this.bpm,two=!(bar&1)&&i===0,rich=m==='menu'||m==='boot'||m==='hold',pl=m==='play'||m==='boss',f=k=>r*Math.pow(2,ch[1+k]/12);
  if(two){this.tone(r/2,t,bl*8,'sawtooth',.1,160,2.5);                                         // deep drone
   if((rich&&m!=='hold')||this.danger)[0,1,2].forEach(k=>{this.tone(f(k)*2,t,bl*8,'sawtooth',rich?.022:.014,800,1.8);this.tone(f(k)*2*1.004,t,bl*8,'sawtooth',rich?.016:.01,800,2.2)});   // slow strings
   else if(pl)this.tone(f(1)*2,t,bl*8,'sawtooth',.012,500,2.5)}
  if(rich&&m!=='hold'){if(i===0)this.piano(f(2)*2,t,.16);if(i===6)this.piano(f(1)*4,t,.12);if(i===10)this.piano(f(0)*4,t,.11);if(i===14&&bar%2)this.piano(f(2)*4,t,.09)}   // slow emotional piano
  if(pl){if(two)this.boom(t,m==='boss'?.30:.18);if(m==='boss'&&(i===8||i===12))this.boom(t,.12);if(i===0&&bar%4===2)this.piano(f(0)*2,t,.07)}                                   // restrained cinematic percussion
  if(this.danger&&pl){if(i%4===0)this.thump(t,.2);if(i%4===1)this.thump(t,.12);if(two)this.tone(r/4,t,bl*8,'sine',.12,90,.5)}},                                                // heartbeat + sub tone
 tone(f,t,d,type,vol,hz,att,dry){const a=AC,o=a.createOscillator(),g=a.createGain(),fl=a.createBiquadFilter();o.type=type;o.frequency.value=f;fl.type='lowpass';fl.frequency.value=hz;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+(att||.01));g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(fl);fl.connect(g);g.connect(dry?this.master:this.fx);o.start(t);o.stop(t+d+.05)},
 kick(t,v){const a=AC,o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(42,t+.16);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.34);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.36)},
 noise(t,hz,type,v,d){const a=AC,n=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();n.buffer=this.nb;f.type=type;f.frequency.value=hz;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(f);f.connect(g);g.connect(this.master);n.start(t);n.stop(t+d)},
 bass808(f,t,d,v){const a=AC,o=a.createOscillator(),o2=a.createOscillator(),g=a.createGain(),g2=a.createGain();o.frequency.setValueAtTime(f*1.6,t);o.frequency.exponentialRampToValueAtTime(f,t+.06);o2.frequency.value=f*2;g2.gain.value=.25;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);o2.connect(g2);g2.connect(g);g.connect(this.master);o.start(t);o2.start(t);o.stop(t+d+.05);o2.stop(t+d+.05)},
 /* energetic street-style instrumental: kick + clap, 808 sub bass following the kicks, hi-hats with rolls and a dark synth stab (original, synthesized) */
 beatStreet(s,t){const bar=s>>4,i=s&15,m=this.mood,ch=CHORDS[(bar>>1)&3],r=ch[0]/2,hi=m==='play'||m==='boss'||m==='hold',boss=m==='boss',wild=this.danger||boss;
  if(m!=='boot'){if(i===0||i===6||i===10||(boss&&i===3)||(bar%4===3&&i===14))this.kick(t,.55);if(i===8||(boss&&i===12))this.noise(t,1900,'bandpass',.3,.14);
   if(i===0||i===6||i===10)this.bass808(r,t,.42,.34);if(i===14&&bar%2)this.bass808(r*1.498,t,.3,.26)}
  if(i%2===0)this.noise(t,7500,'highpass',i%4===0?.06:.04,.05);if((wild||hi)&&(i===13||i===15||(wild&&i%2===1)))this.noise(t,8200,'highpass',.035,.03);
  if(i===0||i===8||(hi&&(i===3||i===11)))this.tone(r*8*Math.pow(2,ch[1+((i>>3)+bar)%3]/12),t,.28,'sawtooth',hi?.03:.022,1400,.004);
  if(this.danger&&i===4)this.tone(r*8*1.414,t,.3,'square',.025,1500,.004)},
 piano(f,t,v){const a=AC;[[1,1],[2,.3],[3,.1]].forEach(([h,gn])=>{const o=a.createOscillator(),e=a.createGain();o.type=h===1?'triangle':'sine';o.frequency.value=f*h;
  e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(v*gn,t+.01);e.gain.exponentialRampToValueAtTime(.0001,t+2.6);o.connect(e);e.connect(this.fx);o.start(t);o.stop(t+2.7)})},
 boom(t,v){const a=AC,o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(72,t);o.frequency.exponentialRampToValueAtTime(36,t+1);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+1.2)},
 thump(t,v){const a=AC,o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(62,t);o.frequency.exponentialRampToValueAtTime(40,t+.14);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.25)},
 /* one-shot musical endings: restrained resolution for a won mission, slow melancholic piano for game over */
 stinger(kind){if(!this.on||SAVE.mute||SAVE.nomusic)return;const t=AC.currentTime+.06;
  if(kind==='win'){[[220,0],[277.18,.4],[329.63,.8],[440,1.3]].forEach(([f,d])=>this.piano(f,t+d,.15));[220,277.18,329.63].forEach(f=>this.tone(f,t,5,'sawtooth',.02,900,1.2));this.hold=t+6}
  else if(kind==='lose'){[[293.66,0],[349.23,1.5],[440,3],[261.63,4.7],[146.83,6.3]].forEach(([f,d])=>this.piano(f,t+d,.15));this.tone(73.42,t,9,'sawtooth',.05,220,1.5);this.hold=t+9.5}}};
/* music can only start after the player's first tap/key (browser autoplay rule); the same tap also starts it on the loading screen */
if(typeof addEventListener==='function')['pointerup','keydown','touchend'].forEach(ev=>addEventListener(ev,()=>Music.start(),{once:true,capture:true}));
