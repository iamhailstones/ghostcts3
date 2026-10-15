"use strict";
/* market.js - gun market overlay, weapon sprites and the empty-magazine reload pop-up (uses the game's existing overlay style) */
function gunSprite(c,id,px,py,w,h){const W0=WEAPONS[id]||WEAPONS.pistol,dark='#14171c',body='#2b3140',acc=W0.col;
 c.save();c.translate(px,py);c.scale(w/100,h/36);c.lineJoin='round';c.lineWidth=1.5;c.strokeStyle='#05070d';
 const R=(a,b,cw,ch,f)=>{c.fillStyle=f||body;c.fillRect(a,b,cw,ch);c.strokeRect(a,b,cw,ch)};
 if(id==='smg'){R(10,12,50,10);R(60,13,22,5,dark);R(34,22,9,12,dark);R(22,20,7,10);R(8,10,4,10,dark);R(56,11,7,4,acc)}
 else if(id==='shotgun'){R(2,14,28,9,'#5a4636');R(30,12,48,7);R(44,19,22,6,dark);R(78,13,18,4,dark);R(36,10,6,3,acc)}
 else if(id==='rifle'){R(4,13,22,10,'#3a3f33');R(26,11,36,9);R(62,13,30,4,dark);R(40,20,10,14,dark);R(34,6,24,5,dark);R(36,7,6,3,acc)}
 else if(id==='sniper'){R(2,13,26,10,'#3a3f33');R(28,12,40,7);R(68,14,30,3,dark);R(34,3,28,8,dark);R(62,5,5,4,acc);R(50,19,4,12,dark)}
 else{R(30,10,44,9);R(32,19,10,15,dark);R(70,11,10,3,acc);R(26,12,5,5,dark)}
 c.restore()}
const GM={from:'menu',
 live(id){const p=G&&G.p;return this.from==='play'&&p&&p.stash?(p.gun===id?p:p.stash[id]):null},
 reserveOf(id){const s=this.live(id);return s?s.reserve:(SAVE.guns.res[id]||0)},
 open(){if(state!=='menu'&&state!=='play')return;this.from=state;state='market';this.msg(SAVE.tips.market?'':'Earn credits by defeating enemies, then buy a gun here. Each gun follows a Python data-type rule.');SAVE.tips.market=1;this.render();show('market')},
 close(){state=this.from;show(this.from==='play'?null:'menu')},
 msg(t){$('gmMsg').textContent=t},
 render(){const g=SAVE.guns,cur=this.from==='play'&&G&&G.p?G.p.gun:g.sel,list=$('gmList');
  $('gmCred').textContent='CREDITS  '+SAVE.credits+'   |   earned by defeating enemies and clearing levels';
  list.innerHTML=Object.keys(WEAPONS).map(id=>{const w=WEAPONS[id],own=g.owned.includes(id);
   const btn=!own?'<button data-a="buy" data-i="'+id+'">BUY  '+w.price+'</button>':cur===id?'<button disabled>EQUIPPED</button>':'<button data-a="eq" data-i="'+id+'">EQUIP</button>';
   const ammo=id==='pistol'?'<div class="note">AMMO: PYTHON TUPLE REARM</div>':own?'<div class="st"><span>RESERVE</span><span>'+this.reserveOf(id)+'</span></div><div class="row"><button data-a="ammo" data-i="'+id+'">+'+w.pack+' AMMO  '+w.packCost+'</button></div>':'';
   return '<div class="gmc'+(cur===id?' sel':'')+'"><b>'+w.name+'</b> <span class="py">'+w.py+'</span><canvas width="160" height="56" data-g="'+id+'"></canvas>'+
    '<div class="st"><span>DAMAGE</span><span>'+w.dmg+(w.pellets>1?' x'+w.pellets:'')+'</span></div><div class="st"><span>FIRE RATE</span><span>'+(1/w.rate).toFixed(1)+'/s</span></div>'+
    '<div class="st"><span>MAGAZINE</span><span>'+w.mag+'</span></div><div class="st"><span>RELOAD</span><span>'+w.reload+'s</span></div><div class="rule">'+w.rule+'</div><div class="row">'+btn+'</div>'+ammo+'</div>'}).join('');
  list.querySelectorAll('canvas').forEach(cv=>gunSprite(cv.getContext('2d'),cv.dataset.g,10,6,140,44))},
 buy(id){const w=WEAPONS[id],g=SAVE.guns;if(!w||g.owned.includes(id))return;if(SAVE.credits<w.price)return this.msg('NOT ENOUGH CREDITS');
  SAVE.credits-=w.price;g.owned.push(id);g.res[id]=(g.res[id]||0)+w.startRes;const p=G&&G.p;
  if(this.from==='play'&&p&&p.stash){const m=Math.min(w.mag,w.startRes);p.stash[id]={mag:m,reserve:w.startRes-m}}
  store();this.equip(id);this.msg(w.name+' PURCHASED')},
 equip(id){if(!SAVE.guns.owned.includes(id))return;SAVE.guns.sel=id;if(this.from==='play'&&G&&G.p)switchGun(id);store();this.render()},
 ammo(id){const w=WEAPONS[id],g=SAVE.guns;if(!w||!g.owned.includes(id)||!w.pack)return;if(SAVE.credits<w.packCost)return this.msg('NOT ENOUGH CREDITS');
  if(this.reserveOf(id)+w.pack>w.mag*10)return this.msg('AMMO FULL');SAVE.credits-=w.packCost;g.res[id]=(g.res[id]||0)+w.pack;
  const s=this.live(id);if(s)s.reserve+=w.pack;store();this.render();this.msg('+'+w.pack+' '+w.name+' ROUNDS')}};
/* empty-magazine pop-up: shown only for the default pistol while its magazine is empty and it is not reloading */
let rlOn=false;
function rlSync(){}   // the old non-blocking pop-up is replaced by the blocking Python rule console (pyrules.js)
function rearmPistol(){const p=G.p;openCh(3,p.reserve<=0&&!othersAmmo())}
$('gmList').addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(!b||b.disabled)return;const a=b.dataset.a,i=b.dataset.i;
 if(a==='buy')GM.buy(i);else if(a==='eq')GM.equip(i);else if(a==='ammo')GM.ammo(i);b.blur()});
$('gmClose').onclick=()=>GM.close();$('gunb').onclick=()=>GM.open();
$('rlR').onclick=e=>{e.target.blur();reload()};$('rlP').onclick=e=>{e.target.blur();rearmPistol()};
