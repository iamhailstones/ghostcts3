"use strict";
/* touch.js - on-screen joysticks and buttons for phones and tablets */
(function(){
 if(!(window.matchMedia&&matchMedia('(pointer:coarse)').matches))return;
 const box=document.createElement('div');box.id='touch';
 box.innerHTML='<div class="js" id="jl"><i></i></div><div class="js" id="jr"><i></i></div><button id="tr">R</button><button id="tb">BOMB</button><button id="tq">Q</button><button id="tc">PY</button><button id="tw">SW</button><button id="tg">GUN</button><button id="tf" aria-label="Fire">FIRE</button>';
 $('wrap').appendChild(box);
 function stick(id,onMove,onEnd){const el=$(id),knob=el.firstChild;let pid=null;
  const vec=e=>{const r=el.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=Math.hypot(dx,dy)||1,k=Math.min(1,m/(r.width/2));return{x:dx/m*k,y:dy/m*k,k}};
  const move=e=>{const v=vec(e);knob.style.transform='translate('+v.x*30+'px,'+v.y*30+'px)';onMove(v)};
  el.addEventListener('pointerdown',e=>{pid=e.pointerId;el.setPointerCapture(pid);move(e);e.preventDefault()});
  el.addEventListener('pointermove',e=>{if(e.pointerId===pid)move(e)});
  const end=e=>{if(e.pointerId!==pid)return;pid=null;knob.style.transform='';onEnd()};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
 stick('jl',v=>{K.a=v.x<-.3;K.d=v.x>.3;K.w=v.y<-.3;K.s=v.y>.3},()=>{K.a=K.d=K.w=K.s=false});
 let aimStick=false,fireHeld=false;
 stick('jr',v=>{if(!G)return;aimStick=true;M.x=G.p.x+v.x*150;M.y=G.p.y+v.y*150;M.down=v.k>.3},()=>{aimStick=false;M.down=fireHeld});
 /* FIRE button: hold to shoot. It auto-aims at the nearest enemy (or straight up if none); the right stick still overrides aim while it is used. */
 {const f=$('tf');let pid=null;
  const aim=()=>{if(pid===null)return;if(state==='play'&&G&&!aimStick){const p=G.p;let b=null,bd=1e9;for(const e of G.enemies){if(e.dead)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;b=e}}M.x=b?b.x:p.x;M.y=b?b.y:p.y-150}M.down=state==='play';requestAnimationFrame(aim)};
  f.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='play')return;pid=e.pointerId;fireHeld=true;try{f.setPointerCapture(pid)}catch(_){}requestAnimationFrame(aim)});
  const end=e=>{if(e.pointerId!==pid)return;pid=null;fireHeld=false;if(!aimStick)M.down=false};f.addEventListener('pointerup',end);f.addEventListener('pointercancel',end)}
 const tap=(id,fn)=>$(id).addEventListener('pointerdown',e=>{e.preventDefault();if(state==='play')fn()});
 tap('tr',reload);tap('tb',throwBomb);tap('tq',phantomStrike);tap('tc',nextChallenge);tap('tw',cycleGun);tap('tg',()=>GM.open());
})();
