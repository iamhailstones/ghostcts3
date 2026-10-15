"use strict";
/* main.js - input handling, game loop, start-up */
/* ---------- INPUT & LOOP (listeners registered once, one rAF loop) ---------- */
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
 if(Boot.active){Boot.onKey(e);return}
 if(state==='chat'){if(k==='escape')Assistant.close();return}
 if(state==='tut'){if(k==='escape')Tut.close();return}
 if(state==='cfm'){if(k==='escape')Confirm.no();return}
 if(state==='pyr')return;   // the Python rule console cannot be dismissed with keys
 if(state==='market'){if(k==='escape'||k==='g')GM.close();return}
 if(k==='escape'){pause();return}
 if(e.target.id==='cin'||e.target.id==='pname')return;
 if(('wasd'.includes(k)&&k.length===1)||k.startsWith('arrow')){K[k]=true;if(k.startsWith('arrow')&&state==='play')e.preventDefault()}   // arrow keys move like WASD (and must not scroll the page)
 if(state!=='play'||e.repeat)return;
 if(k==='r')reload();else if(k==='b')throwBomb();
 else if(k==='c')nextChallenge();
 else if(k==='m')toggleMute();
 else if(k==='n')toggleMusic();
 else if(/^[1-5]$/.test(k))equipSlot(+k-1);
 else if(k==='e')cycleGun();
 else if(k==='g')GM.open();
 else if(k==='p')PR.open('manual');
 else if(k==='q')phantomStrike()});
addEventListener('keyup',e=>{K[e.key.toLowerCase()]=false});
addEventListener('blur',()=>{K={};M.down=false;if(state==='play')pause()});
function mpos(e){const r=cv.getBoundingClientRect();M.x=(e.clientX-r.left)*W/r.width;M.y=(e.clientY-r.top)*H/r.height}
cv.addEventListener('mousemove',mpos);cv.addEventListener('mousedown',e=>{mpos(e);M.down=true});addEventListener('mouseup',()=>M.down=false);
cv.addEventListener('contextmenu',e=>e.preventDefault());
let looping=true;
function startLoop(){if(looping)return;looping=true;last=performance.now();requestAnimationFrame(loop)}   // used when coming back from the exit screen
function loop(t){if(state==='exited'){looping=false;return}requestAnimationFrame(loop);const dt=Math.min(.05,(t-last)/1000||0);last=t;T+=dt;Music.sync();rlSync();if(document.body.classList.contains('playing')!==(state==='play'))document.body.classList.toggle('playing',state==='play');if(state==='play')update(dt);draw();hud()}
toMenu();Boot.start();Orient.start();requestAnimationFrame(loop);

if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
