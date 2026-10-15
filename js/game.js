"use strict";
/* game.js - game state, level setup, main update step, level completion */
/* ---------- STATE ---------- */
let T=0,state='menu',prev='menu',G=null,score=0,levelScore=0,kills=0,K={},M={x:450,y:300,down:false},cur=null,trainI=-1,last=0;
const msg=(t)=>{const m=$('msg');m.textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>m.textContent='',1800)};
const show=id=>{['menu','pause','end','chal','market','pyr','cfm','exit','chatp','tut'].forEach(o=>$(o).classList.toggle('on',o===id));if(id&&typeof Tips!=='undefined')Tips.hide()};
/* Two scores: `score` is the TOTAL (every point ever earned this run, kept across levels and retries);
   `levelScore` is the CURRENT LEVEL score (reset to 0 each time a level starts or is retried). All points go through addScore(). */
function addScore(n){score+=n;levelScore+=n}
function newLevel(n){
 const boss=n===10;levelScore=0;
 G={feed:[],decals:[],lvl:n,total:COUNT[n-1],spawned:0,wave:1,waves:boss?1:3,waveWait:0,spT:1,enemies:[],bul:[],eb:[],bombs:[],fx:[],pk:[],shake:0,shots:0,hits:0,combo:0,comboT:0,boss:null,
  p:{x:450,y:520,r:12,hp:CFG.hp,mag:CFG.mag,reserve:Math.max(24,CFG.reserve-4*(n-1)),bombs:Math.min(CFG.maxBombs,CFG.bombs),a:0,cd:0,rel:0,hurt:0,sh:0,sk:0}};initGuns();
 if(boss){const b=mk('grunt',450,90);Object.assign(b,{type:'boss',boss:1,r:32,hp:900,max:900,sp:60,dmg:14,pts:1000,t:{col:'#ff2e63'},ph:1,fire:1,sum:4,shield:false,shDone:false});G.enemies.push(b);G.boss=b}
 state='end';showEnd((boss?'BOSS FIGHT: ':'LEVEL '+n+': ')+LV[n-1],BRIEF[n-1],'DEPLOY',()=>{state='play';show(null);msg('GO!');Voice.event('start',{lvl:n});Tips.level(n)});
}
function fxBurst(px,py,n,col,sp){for(let i=0;i<n&&G.fx.length<300;i++){const a=rnd(0,6.28),v=rnd(20,sp||120);G.fx.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.3,.7),col})}}
function obsPush(o){for(const b of OBS.slice(0,Math.min(5,2+(G.lvl>>1)))){const cx=clamp(o.x,b.x,b.x+b.w),cy=clamp(o.y,b.y,b.y+b.h),dx=o.x-cx,dy=o.y-cy,d=Math.hypot(dx,dy);
 if(d<o.r){if(d>0){o.x+=dx/d*(o.r-d);o.y+=dy/d*(o.r-d)}else{o.y-=o.r}}}}
const inObs=(px,py)=>OBS.slice(0,Math.min(5,2+(G.lvl>>1))).some(b=>px>b.x&&px<b.x+b.w&&py>b.y&&py<b.y+b.h);
function update(dt){const p=G.p;
 let mx=(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0),my=(K.s||K.arrowdown?1:0)-(K.w||K.arrowup?1:0);const m=Math.hypot(mx,my);if(m){mx/=m;my/=m}
 p.x=clamp(p.x+mx*CFG.speed*dt,p.r,W-p.r);p.y=clamp(p.y+my*CFG.speed*dt,p.r,H-p.r);obsPush(p);p.mv=m>0;
 p.a=Math.atan2(M.y-p.y,M.x-p.x);p.cd-=dt;p.hurt-=dt;p.sh-=dt;p.sk-=dt;G.shake-=dt;G.comboT-=dt;G.flash=(G.flash||0)-dt;G.hm=(G.hm||0)-dt;G.kt=(G.kt||0)-dt;G.hitT=(G.hitT||0)-dt;for(const f of G.feed)f.life-=dt;G.feed=G.feed.filter(f=>f.life>0);p.mf=(p.mf||0)-dt;
 if(p.rel>0){p.rel-=dt;if(p.rel<=0){const n=Math.min(gun().mag-p.mag,p.reserve);p.mag+=n;p.reserve-=n}}
 if(M.down)shoot();
 for(const b of G.bul){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.x<0||b.x>W||b.y<0||b.y>H||inObs(b.x,b.y)){b.life=0;continue}
  for(const e of G.enemies){if(!e.dead&&!(b.hs&&b.hs.has(e))&&Math.hypot(e.x-b.x,e.y-b.y)<e.r+3){hurt(e,(b.d||CFG.dmg)*(b.m?(b.m[e.type]||1):1)*(SAVE.perks.crit?1.3:1));G.hm=.12;if(!e.shield)G.hits++;if(b.hs)b.hs.add(e);if(b.pr>1)b.pr--;else b.life=0;fxBurst(b.x,b.y,3,'#fff',70);break}}}
 for(const b of G.eb){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.x<0||b.x>W||b.y<0||b.y>H||inObs(b.x,b.y))b.life=0;
  else if(Math.hypot(b.x-p.x,b.y-p.y)<p.r+3){hurtPlayer(b.dmg,b);b.life=0}}
 for(const b of G.bombs){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=.97;b.vy*=.97;b.t-=dt;if(b.x<5||b.x>W-5)b.vx*=-1;if(b.y<5||b.y>H-5)b.vy*=-1;if(b.t<=0){explode(b.x,b.y,CFG.blastR*(SAVE.perks.bomb?1.25:1),CFG.blastDmg,1)}}
 G.bombs=G.bombs.filter(b=>b.t>0);
 spawn(dt);for(const e of G.enemies)if(!e.dead)updEnemy(e,dt);
 G.enemies=G.enemies.filter(e=>!e.dead);G.bul=G.bul.filter(b=>b.life>0);G.eb=G.eb.filter(b=>b.life>0);
 for(const f of G.fx){f.life-=dt;if(!f.ring){f.x+=f.vx*dt;f.y+=f.vy*dt}}G.fx=G.fx.filter(f=>f.life>0);
 for(const k of G.pk){if(state!=='play'||Math.hypot(k.x-p.x,k.y-p.y)>20)continue;k.got=1;
  if(k.k==='a'){p.reserve+=12;msg('AMMO +12')}else if(k.k==='h'){p.hp=Math.min(CFG.hp,p.hp+25);msg('HEALTH +25');if(p.hp>CFG.hp*.45){G.lowHp=G.critHp=0}}
  else if(k.k==='b'){p.bombs=Math.min(CFG.maxBombs,p.bombs+1);msg('BOMB +1')}else{p.sh=6;msg('SHIELD')}}
 G.pk=G.pk.filter(k=>!k.got);
 if(G.spawned>=G.total&&!G.enemies.length&&state==='play'){levelDone()}}
function levelDone(){state='end';sfx('win');Voice.event('win');Music.stinger('win');const acc=G.shots?Math.floor(G.hits/G.shots*200):0;addScore(100*G.lvl+acc);SAVE.credits+=60*G.lvl;syncGuns();
 SAVE.best=Math.max(SAVE.best,score);const boss=G.lvl===10;if(!boss)SAVE.lvl=Math.max(SAVE.lvl,G.lvl+1);store();
 if(boss)showEnd('CAMPAIGN VICTORY','The Commander is down. Final score '+score,'MAIN MENU',toMenu);
 else showEnd('LEVEL COMPLETE','Score '+score+' | Accuracy bonus +'+acc+' | Python tip: '+TIPS[G.lvl-1],'NEXT LEVEL',()=>newLevel(G.lvl+1))}
