"use strict";
/* ui.js - overlays, menu, challenge terminal, HUD */
/* ---------- UI ---------- */
function showEnd(t,s,b,fn){$('et').textContent=t;$('es').textContent=s;$('eb').textContent=b;$('eb').onclick=fn;show('end')}
function toMenu(){state='menu';G=null;updSnd();$('pname').value=SAVE.name||'';$('saveinfo').textContent='Best score '+SAVE.best+' | Highest level '+SAVE.lvl+' | Total kills '+SAVE.kills+' | Challenges solved '+SAVE.done.length+'/'+CH.length;
 $('play').textContent=SAVE.lvl>1?'CONTINUE (LEVEL '+SAVE.lvl+')':'PLAY';show('menu')}
function openCh(i,req,win,train){if(state==='chal')return;prev=state;state='chal';const c=CH[i];cur={i,req,win,train,done:false,fails:0};Voice.event('lesson');$('cguide').textContent=SAVE.done.length<2?'How to: 1) read the task  2) type your code in the green box  3) press RUN CHECK. Stuck? Press HINT.':'';
 $('ct').textContent=c.title;$('cl').textContent=c.lesson||'';$('cm').textContent='CONCEPT: '+c.concept+'  |  DIFFICULTY: '+(c.diff||'EASY');$('cc').textContent=c.code||'# write your code below';$('cc').style.display=c.code?'':'none';
 $('cb').textContent=c.brief;$('cin').value='';$('cfb').textContent='';$('csub').disabled=false;
 $('cclose').textContent='BACK';$('cclose').style.display=req?'none':'';show('chal');$('cin').focus()}
$('csub').onclick=()=>{if(!cur)return;if(cur.pr)return runPractice();const c=CH[cur.i];
 const synErr=pySyntax($('cin').value);if(!synErr&&c.ok(norm($('cin').value))){cur.done=true;sfx('ok');Voice.event('solved');$('csub').disabled=true;let r='';
  if(prev==='play'&&G){r=c.win(G.p);if(!SAVE.done.includes(c.id))SAVE.done.push(c.id);addScore(50);store()}
  $('cfb').textContent='ACCESS GRANTED. '+c.why+(r?' REWARD: '+r:'')+' Press NEXT QUEST to continue.';$('cclose').style.display='';$('cclose').textContent='CONTINUE'}
 else{sfx('no');Voice.event('wrong');cur.fails++;let m='ACCESS DENIED. '+(synErr||pyHint($('cin').value)||c.err);if(cur.fails>=3)m+='\n\nSOLUTION (type it yourself):\n'+c.sol;$('cfb').textContent=m}};
$('chint').onclick=()=>{if(cur)$('cfb').textContent='HINT: '+(cur.pr?PRACTICE[cur.i]:CH[cur.i]).hint};
$('cclose').onclick=()=>{if(!cur)return;const c=cur;cur=null;
 if(c.pr){if(c.done&&c.i<PRACTICE.length-1){state='menu';openPractice(c.i+1);return}state='menu';toMenu();return}
 if(c.train){if(c.done&&c.i<CH.length-1){state='menu';openCh(c.i+1,false,null,true);return}state='menu';toMenu();return}
 state=prev==='play'?'play':prev;show(null);if(c.done&&c.win)c.win();if(state==='menu')toMenu()};
$('play').onclick=()=>{if(document.activeElement)document.activeElement.blur();score=0;kills=0;newLevel(SAVE.lvl)};
$('pname').addEventListener('input',e=>{SAVE.name=e.target.value.replace(/[\u0000-\u001f<>]/g,'').slice(0,12);store()});
$('pname').addEventListener('keydown',e=>{if(e.key==='Enter')e.target.blur()});
$('sndb').onclick=toggleMute;
$('musb').onclick=toggleMusic;
$('train').onclick=()=>{prev='menu';state='menu';openCh(0,false,null,true)};
$('howb').onclick=()=>{const h=$('how');h.style.display=h.style.display==='none'?'':'none'};
$('reset').onclick=()=>Confirm.ask('RESET PROGRESS','This erases your level, credits, weapons and lessons. Sound settings, tips and your codename are kept.','ERASE PROGRESS',()=>{const k={name:SAVE.name,mute:SAVE.mute,nomusic:SAVE.nomusic,vol:SAVE.vol,voice:SAVE.voice,tips:SAVE.tips,tutDone:SAVE.tutDone,mstyle:SAVE.mstyle,voiceName:SAVE.voiceName};SAVE=Object.assign({best:0,lvl:1,kills:0,done:[],perks:{},guns:{owned:['pistol'],sel:'pistol',res:{}},credits:200,pr:[]},k);store();score=0;kills=0;toMenu()});
/* One pause for every screen: gameplay, lessons (challenge terminal) and the market. 'pause' is not 'play', so the world never updates while paused. */
let pausedFrom=null;
function pause(){if(state==='pause'){Voice.event('resume');state=pausedFrom||'play';pausedFrom=null;show(state==='play'?null:state)}
 else if(state==='play'||state==='chal'||state==='market'){pausedFrom=state;state='pause';K={};M.down=false;show('pause');Voice.event('pause')}}
/* Main menu from anywhere: stop gameplay, keep saved progress, ask once before dropping a running level. */
function leaveToMenu(btn){const live=!!G&&(state==='play'||pausedFrom==='play'||state==='pyr'||((state==='chal'||state==='pause')&&prev==='play'));
 if(live&&!btn.dataset.armed){btn.dataset.armed='1';btn.dataset.o=btn.dataset.o||btn.textContent;btn.textContent='CONFIRM: LEAVE GAME?';setTimeout(()=>{delete btn.dataset.armed;btn.textContent=btn.dataset.o},3500);return}
 delete btn.dataset.armed;if(btn.dataset.o)btn.textContent=btn.dataset.o;try{syncGuns();store()}catch(e){}Voice.cancel();K={};M.down=false;cur=null;pausedFrom=null;PR.reset();toMenu()}
function nextQuest(){if(!cur)return;const c=cur;if(c.pr){if(c.i+1>=PRACTICE.length)return msg('NO MORE EXERCISES');const keep=prev;cur=null;state=keep;openPractice(c.i+1);return}if(c.req&&!c.done)return msg('SOLVE THIS CHALLENGE FIRST');
 const j=c.train?(c.i+1<CH.length?c.i+1:-1):CH.findIndex((x,k)=>k!==c.i&&k<=G.lvl+1&&!SAVE.done.includes(x.id));
 if(j<0)return msg('NO MORE QUESTS HERE');const keep=prev;cur=null;state=keep;openCh(j,false,null,c.train)}
$('pbtn').onclick=e=>{e.target.blur();pause()};$('resume').onclick=pause;$('tomenu').onclick=()=>leaveToMenu($('tomenu'));
$('cnext').onclick=nextQuest;$('cmenu').onclick=()=>leaveToMenu($('cmenu'));
function hud(){if(!G){return}const p=G.p;$('hp').style.width=Math.max(0,p.hp/CFG.hp*100)+'%';$('hp').style.background=p.sh>0?'#6fd3ff':p.hp<30?'#ff3b4a':'#39ff7a';
 $('ammo').textContent=(p.rel>0?'RELOADING ':'')+p.mag+'/'+p.reserve;$('bombs').textContent=p.bombs+'/'+CFG.maxBombs;$('lvl').textContent=G.lvl+' '+LV[G.lvl-1];
 $('wave').textContent=G.boss?'BOSS':G.wave+'/'+G.waves;$('left').textContent=(G.total-G.spawned)+G.enemies.length;$('score').textContent=score;$('kills').textContent=kills}
/* Python-style error messages for the most common beginner mistakes (the code is never run) */
function pyHint(code){const ln=code.replace(/#.*$/gm,'').split('\n');
 for(let i=0;i<ln.length;i++){const l=ln[i];
  if(/^\s*(if|elif|else|for|while|def|class|try|except)\b[^\n]*[^:\s]\s*$/.test(l)&&!/\(\s*$/.test(l))return'SyntaxError: line '+(i+1)+' needs a colon (:) at the end.';
  if(/^\s*(if|elif|while)\s+\w+\s*=[^=]/.test(l))return'SyntaxError: use == to compare. A single = assigns a value.';
  if(/:\s*$/.test(l)&&ln[i+1]!==undefined&&ln[i+1].trim()&&!/^\s/.test(ln[i+1]))return'IndentationError: line '+(i+2)+' must be indented after the colon.'}
 const o=(code.match(/[([{]/g)||[]).length,c=(code.match(/[)\]}]/g)||[]).length,q=(code.match(/"/g)||[]).length;
 if(o!==c)return'SyntaxError: brackets do not match (( ) [ ] { }).';if(q%2)return'SyntaxError: a quote mark is not closed.';return''}

/* ---------- in-page confirmation (browser pop-ups are blocked in embedded pages), exit screen, first-time tips ---------- */
const overlayOf=s=>({menu:'menu',pause:'pause',chal:'chal',market:'market',end:'end',pyr:'pyr'})[s]||null;
const Confirm={fn:null,prevState:null,
 ask(title,text,yes,fn){if(state==='cfm')return;this.prevState=state;this.fn=fn;$('cfmT').textContent=title;$('cfmM').textContent=text;$('cfmYes').textContent=yes;state='cfm';show('cfm')},
 no(){if(state!=='cfm')return;state=this.prevState;this.fn=null;show(overlayOf(state))},
 yes(){if(state!=='cfm')return;const f=this.fn;this.fn=null;state=this.prevState;if(f)f()}};
/* a safe in-game exit: save, stop gameplay + music + speech + the frame loop, and show GAME EXITED (a page cannot close its own tab) */
function gameExit(){try{if(G)syncGuns();store()}catch(e){}Voice.cancel();K={};M.down=false;cur=null;pausedFrom=null;PR.reset();G=null;state='exited';Tips.hide();Music.stop();
 try{if(document.fullscreenElement)document.exitFullscreen();if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock()}catch(e){}show('exit')}
function exitBack(){state='menu';Music.restart();startLoop();toMenu()}
const Tips={t:0,
 show(id,text){if(!SAVE.tips||SAVE.tips[id]||state!=='play')return;SAVE.tips[id]=1;store();$('tipT').textContent=text;$('tip').classList.add('on');clearTimeout(this.t);this.t=setTimeout(()=>this.hide(),9000)},
 hide(){clearTimeout(this.t);const e=$('tip');if(e)e.classList.remove('on')},
 level(n){setTimeout(()=>{if(n===1)this.show('move',Orient.mobile?'Defeat every enemy. Move with the left stick; aim and shoot with the right stick.':'Defeat every enemy. Move: W A S D or arrow keys. Aim with the mouse, click to shoot.');
  else if(n===2)this.show('bomb','New: bombs. '+(Orient.mobile?'Tap BOMB':'Press B')+' to throw one. Enemies near the blast take the most damage.')},1200)}};
$('cfmYes').onclick=()=>Confirm.yes();$('cfmNo').onclick=()=>Confirm.no();$('tipX').onclick=()=>Tips.hide();$('exitBack').onclick=exitBack;
$('exitb').onclick=$('pexit').onclick=()=>Confirm.ask('EXIT GAME','Leave the game? Your progress is saved.','EXIT GAME',gameExit);
/* a second tap on the same button within a quarter of a second is ignored, so one action cannot run twice */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(!b)return;const n=Date.now();if(b._t&&n-b._t<260){e.stopImmediatePropagation();e.preventDefault();return}b._t=n},true);

/* ---------- Practice Mode: real Python function exercises (engine: pyengine.js, sandbox: Web Worker) ---------- */
const LABEL={syntax:'SYNTAX ERROR',logic:'LOGIC ERROR',runtime:'RUNTIME ERROR',output:'OUTPUT ERROR',unsupported:'NOT SUPPORTED YET'};
function practiceStart(){const i=PRACTICE.findIndex(x=>!SAVE.pr.includes(x.id));openPractice(i<0?0:i)}
function openPractice(i){if(state==='chal')return;prev=state;state='chal';const x=PRACTICE[i];cur={pr:true,i,done:false,fails:0,busy:false,train:true};
 $('ct').textContent='PRACTICE: '+x.title;$('cm').textContent='LEVEL: '+LEVELS[x.level].toUpperCase()+'  |  EXERCISE '+(i+1)+' OF '+PRACTICE.length+(SAVE.pr.includes(x.id)?'  |  SOLVED':'');
 $('cl').textContent=x.type==='predict'?'No coding needed here: read the code and type the value it gives.':'Write real Python. The function must be named '+x.fn+'. Use return to give the result back (do not print it).';
 $('cc').style.display='none';$('cb').textContent=x.prompt;$('cin').value=x.starter||'';$('cfb').textContent='';$('csub').disabled=false;$('cclose').textContent='BACK';$('cclose').style.display='';
 $('cguide').textContent=SAVE.pr.length<2?'How to: 1) read the whole task  2) type your function in the green box (4 spaces per indent)  3) press RUN CHECK. Stuck? Press HINT.':'';Voice.event('lesson');show('chal');$('cin').focus()}
async function runPractice(){const c=cur;if(!c||c.busy)return;const x=PRACTICE[c.i],code=$('cin').value;c.busy=true;$('csub').disabled=true;$('cfb').textContent='Checking your answer...';let r;
 if(x.type==='predict'){const a=code.trim().replace(/^["']|["']$/g,'');r=x.answers.includes(a)?{status:'ok',message:'Correct.'}:{status:'fail',kind:'logic',message:'That is not the value. Trace the code line by line and try again.'}}
 else{const ind=pySyntax(code);r=ind?{status:'fail',kind:'indent',message:ind}:await PyRunner.run(code,x)}
 if(cur!==c)return;c.busy=false;$('csub').disabled=false;
 if(r.status==='ok'){c.done=true;sfx('ok');Voice.event('solved');const first=!SAVE.pr.includes(x.id);if(first){SAVE.pr.push(x.id);SAVE.credits+=20;store()}$('cfb').textContent='PASSED. '+r.message+' '+x.why+(first?' +20 credits.':'')+' Press NEXT QUEST for the next exercise.';$('cclose').textContent='CONTINUE'}
 else{sfx('no');c.fails++;Voice.event('wrong');$('cfb').textContent=(r.kind==='indent'?'':(LABEL[r.kind]||'ERROR')+': ')+r.message+(r.line&&r.kind!=='indent'?' (line '+r.line+')':'')+(c.fails>=3?'\n\nHint: '+x.hint:'')}}
$('practb').onclick=practiceStart;
