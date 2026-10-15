"use strict";
/* enemies.js - enemy creation, damage, AI, boss logic, wave spawning */
function mk(type,px,py){const T=TYPES[type],l=G.lvl-1,s=1+l*.12;return{type,t:T,x:px,y:py,r:T.r,hp:T.hp*s,max:T.hp*s,sp:T.sp*(1+l*.04),dmg:T.dmg*s,pts:T.pts,cd:0,fire:rnd(.3,1.5),flash:0,dead:0}}
function hurt(e,d,viaBomb){if(e.dead)return false;if(e.shield){fxBurst(e.x,e.y,2,'#6fd3ff',60);return false}
 e.hp-=d;e.flash=.12;
 if(e.hp<=0){e.dead=1;kills++;SAVE.kills++;SAVE.credits+=e.pts;G.combo=G.comboT>0?G.combo+1:1;G.comboT=2;addScore(e.pts+(G.combo>1?5*G.combo:0));Voice.event('kill',{combo:G.combo});
  sfx('kill');fxBurst(e.x,e.y,14,e.t.col,160);G.feed.unshift({txt:(SAVE.name||'GHOST')+'  [ELIMINATED]  '+(e.boss?'THE COMMANDER':e.type.toUpperCase()),life:4.5});if(G.feed.length>5)G.feed.pop();G.kt=.3;if(e.boss){G.eb=[]}
  const r=Math.random(),ammoP=Math.max(.08,.3-.02*G.lvl);
  if(!e.boss){if(r<ammoP)G.pk.push({x:e.x,y:e.y,k:'a'});else if(r<ammoP+.1)G.pk.push({x:e.x,y:e.y,k:'h'});else if(r<ammoP+.15)G.pk.push({x:e.x,y:e.y,k:'b'});else if(r<ammoP+.18)G.pk.push({x:e.x,y:e.y,k:'s'})}
  return true}return false}
function ebullet(e,a,sp,dmg){if(G.eb.length<250)G.eb.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg:dmg||e.dmg,life:3})}
function updEnemy(e,dt){const p=G.p,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;let mx=0,my=0;e.cd-=dt;e.fire-=dt;e.flash-=dt;
 if(e.boss)return updBoss(e,dt,dx,dy,d);
 if(e.t.range){if(d>e.t.range){mx=dx/d;my=dy/d}else if(d<e.t.range*.6){mx=-dx/d;my=-dy/d}
  if(e.t.strafe){mx+=-dy/d*.8;my+=dx/d*.8}
  if(e.fire<=0&&d<e.t.range+90){ebullet(e,Math.atan2(dy,dx)+rnd(-.1,.1),260);e.fire=1.7}}
 else{mx=dx/d;my=dy/d;if(d<e.r+p.r+4&&e.cd<=0){hurtPlayer(e.dmg,e);e.cd=.8}}
 for(const o of G.enemies){if(o===e||o.dead)continue;const ox=e.x-o.x,oy=e.y-o.y,od=Math.hypot(ox,oy);if(od>0&&od<e.r+o.r){mx+=ox/od*.9;my+=oy/od*.9}}
 e.x+=mx*e.sp*dt;e.y+=my*e.sp*dt;obsPush(e);e.x=clamp(e.x,e.r,W-e.r);e.y=clamp(e.y,e.r,H-e.r)}
function updBoss(e,dt,dx,dy,d){const r=e.hp/e.max,a=Math.atan2(dy,dx),t=performance.now()/1000;
 e.ph=r>.66?1:r>.33?2:3;
 if(e.ph===3&&!e.shDone){e.shDone=true;e.shield=true;openCh(6,true,()=>{e.shield=false;msg('SHIELD DISABLED - ATTACK!')});msg('COMMANDER SHIELD ONLINE')}
 const sp=e.sp*(e.ph>1?1.5:1);e.x=clamp(450+Math.cos(t*.5*(e.ph>1?1.4:1))*300,e.r,W-e.r);e.y=clamp(120+Math.sin(t*.9)*60,e.r,H-e.r);
 if(d<e.r+G.p.r&&e.cd<=0){hurtPlayer(e.dmg,e);e.cd=.8}
 if(e.fire<=0){const n=e.ph===1?3:5;for(let i=0;i<n;i++)ebullet(e,a+(i-(n-1)/2)*.2,240,10);if(e.ph===3){for(let i=0;i<10;i++)ebullet(e,i*.628+t,170,8)}e.fire=e.ph===1?1.4:e.ph===2?1:.9}
 if(e.ph>=2){e.sum-=dt;if(e.sum<=0){e.sum=6;if(G.enemies.length<10){G.enemies.push(mk('grunt',e.x-30,e.y+40),mk('runner',e.x+30,e.y+40));msg('REINFORCEMENTS')}}}}
function spawn(dt){if(G.boss||G.spawned>=G.total)return;const size=Math.ceil(G.total/G.waves);
 if(G.spawned>0&&G.spawned%size===0&&G.gate!==G.spawned){if(G.enemies.length>0)return;if(!(G.waveWait>0)){G.waveWait=2;G.wave=Math.min(G.waves,Math.floor(G.spawned/size)+1);msg('WAVE '+G.wave);if(G.wave>1)Voice.event('progress')}G.waveWait-=dt;if(G.waveWait>0)return;G.gate=G.spawned;G.waveWait=0}
 G.spT-=dt;if(G.spT>0||G.enemies.length>=Math.min(12,6+(G.lvl>>1)))return;G.spT=Math.max(.5,2-G.lvl*.13);
 const side=Math.floor(Math.random()*4),px=side<2?rnd(20,W-20):(side===2?15:W-15),py=side<2?(side?H-15:15):rnd(20,H-20),pool=POOL[G.lvl-1];
 G.enemies.push(mk(pool[Math.floor(Math.random()*pool.length)],px,py));G.spawned++}
