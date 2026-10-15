"use strict";
/* voice.js - gentle female voice feedback using the browser's built-in speech synthesis (no files, no online service, no packages).
   Announcements come from REAL game events (Voice.event is called where the event actually happens). Routine praise has cooldowns,
   urgent warnings may interrupt, nothing is ever queued, and everything stops when leaving the game. If the device has no speech
   synthesis the game simply stays silent. Which voice you hear depends on the device: we pick the best female English voice available. */
const Voice={ok:typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined',voice:null,last:0,curPrio:0,seen:{},kills:0,lessons:0,wrongN:0,btns:[],styleBtns:[],
 FEMALE:/female|aria|jenny|zira|samantha|susan|hazel|karen|moira|tessa|serena|libby|sonia|natasha|fiona|victoria|ava|allison|catherine|emma|joanna|salli|kendra|amy|heather/i,
 MALE:/\b(male|david|mark|daniel|alex|fred|george|james|guy|ryan|thomas|brian|matthew|oliver|arthur|rishi)\b/i,
 PHRASES:{welcome:'Welcome to GHOST CTS3.',start1:'Stay alert. Your mission starts now.',start:"You've got this. Let's move.",good:'Good shot.',two:'Nice work. Two targets down.',three:'Excellent. Three targets down.',many:'Well done. Keep moving.',
  progress:'Good progress. Keep going.',lowhp:'Careful. Your health is getting low.',critical:'Careful. Your health is critically low.',lowammo:"You're running low on ammunition.",reload:"Reload when it's safe.",
  win:'Mission complete. Excellent work.',lose:'Mission failed. Rest, regroup, and try again.',lesson1:"Let's learn something new. Read the task carefully, then enter your code.",lesson:'Take your time. You can do this.',
  wrong:['Not quite. Check your code and try again.','Take another look at the instructions.',"You're learning. Give it another try."],solved:["Excellent work. Your code is correct.","Well done. You've completed the challenge."],pause:'Game paused.',resume:'Welcome back. Stay focused.'},
 list(){try{return speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang))}catch(e){return[]}},
 /* assistant answers: interrupts anything, slightly lower pitch and calm pace for a warm, confident tone (the actual voice depends on the device) */
 speakNow(text){if(!this.enabled())return false;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);this.voice=this.voice||this.pick();if(this.voice){u.voice=this.voice;u.lang=this.voice.lang}else u.lang='en-US';u.rate=.95;u.pitch=.92;u.volume=SAVE.vol.v;this.curPrio=3;u.onstart=()=>{Music.duck=.65};u.onend=u.onerror=()=>{Music.duck=1;this.curPrio=0};speechSynthesis.speak(u);return true}catch(e){return false}},
 pick(){try{const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang)),chosen=SAVE.voiceName&&vs.find(v=>v.name===SAVE.voiceName);if(chosen)return chosen;return vs.find(v=>this.FEMALE.test(v.name)&&!this.MALE.test(v.name))||vs.find(v=>!this.MALE.test(v.name))||null}catch(e){return null}},
 enabled(){return this.ok&&SAVE.voice!==false&&!SAVE.mute},
 /* prio: 1 routine, 2 important, 3 urgent. Same key = cooldown; routine lines also keep a global gap; busy speaking = only higher priority interrupts */
 say(key,text,prio,cool){if(!this.enabled())return false;const now=Date.now();
  if(this.seen[key]!==undefined&&now-this.seen[key]<cool)return false;
  if(speechSynthesis.speaking||speechSynthesis.pending){if(prio<=this.curPrio)return false;speechSynthesis.cancel()}
  if(prio<2&&now-this.last<3500)return false;
  this.seen[key]=now;this.last=now;this.curPrio=prio;
  try{const u=new SpeechSynthesisUtterance(text);this.voice=this.voice||this.pick();if(this.voice){u.voice=this.voice;u.lang=this.voice.lang}else u.lang='en-US';
   u.rate=.92;u.pitch=1.05;u.volume=SAVE.vol.v;u.onstart=()=>{Music.duck=.65};u.onend=u.onerror=()=>{Music.duck=1;this.curPrio=0};speechSynthesis.speak(u)}catch(e){return false}return true},
 event(name,d){if(!this.enabled())return false;const P=this.PHRASES;d=d||{};
  switch(name){
   case'welcome':return this.say('welcome',P.welcome,1,1e12);
   case'start':return this.say('start',d.lvl===1?P.start1:P.start,1,25000);
   case'kill':if(d.combo>=3)return this.say('k3',P.three,1,6000);if(d.combo===2)return this.say('k2',P.two,1,6000);return this.say('k1',P.good,1,30000);
   case'progress':return this.say('progress',P.progress,1,20000);
   case'lowhp':return this.say('lowhp',P.lowhp,2,25000);case'critical':return this.say('critical',P.critical,3,25000);
   case'lowammo':return this.say('lowammo',P.lowammo,1,30000);case'reload':return this.say('reload',P.reload,1,40000);
   case'win':return this.say('win',P.win,2,3000);case'lose':return this.say('lose',P.lose,3,3000);
   case'lesson':return this.say('lesson',this.lessons++===0?P.lesson1:P.lesson,1,this.lessons===1?1e12:60000);
   case'wrong':return this.say('wrong',P.wrong[this.wrongN++%3],1,10000);
   case'solved':return this.say('solved',P.solved[this.wrongN++%2],2,3000);
   case'pause':return this.say('pause',P.pause,2,5000);case'resume':return this.say('resume',P.resume,2,5000)}
  return false},
 cancel(){try{if(this.ok)speechSynthesis.cancel()}catch(e){}this.curPrio=0;Music.duck=1},
 refresh(){const t=!this.ok?'VOICE: N/A':'VOICE: '+(SAVE.voice!==false?'ON':'OFF');this.btns.forEach(b=>{b.textContent=t;b.disabled=!this.ok})}};
if(Voice.ok)try{speechSynthesis.onvoiceschanged=()=>{Voice.voice=null}}catch(e){}   // voices load late on some browsers: pick again
/* audio settings (music / effects / voice volume + voice on/off), built into the menu and the pause screen */
function buildAudio(el){if(!el||typeof document==='undefined')return;el.textContent='';
 [['MUSIC','m'],['SFX','s'],['VOICE','v']].forEach(([lab,k])=>{const l=document.createElement('label'),r=document.createElement('input');l.textContent=lab+' ';r.type='range';r.min=0;r.max=100;r.value=Math.round(SAVE.vol[k]*100);r.setAttribute('aria-label',lab+' volume');
  r.oninput=()=>{SAVE.vol[k]=r.value/100;mix();store()};l.appendChild(r);el.appendChild(l)});
 const b=document.createElement('button');b.className='vb';b.onclick=()=>{SAVE.voice=!(SAVE.voice!==false);store();if(SAVE.voice===false)Voice.cancel();else Voice.say('on','Voice on.',2,0);Voice.refresh()};el.appendChild(b);Voice.btns.push(b);Voice.refresh();
 const sb=document.createElement('button');sb.className='vb sb';sb.onclick=()=>{SAVE.mstyle=SAVE.mstyle==='cinema'?'street':'cinema';store();Voice.styleBtns.forEach(x=>x.textContent='STYLE: '+(SAVE.mstyle==='cinema'?'CINEMATIC':'STREET'))};el.appendChild(sb);Voice.styleBtns.push(sb);sb.textContent='STYLE: '+(SAVE.mstyle==='cinema'?'CINEMATIC':'STREET')}
if(typeof $==='function'){buildAudio($('audMenu'));buildAudio($('audPause'))}
