"use strict";
/* weapons.js - weapon table, shooting, reloading, weapon switching and per-weapon ammo.
   The pistol is the default weapon and keeps its original values (taken from CFG). Its ammo is refilled with the Python tuple rearm. */
const WEAPONS={
 pistol:{name:'TUPLE',py:'tuple',rule:'IMMUTABLE: it cannot be changed directly. Convert to a list, edit, convert back to rearm.',price:0,dmg:CFG.dmg,rate:CFG.fireRate,mag:CFG.mag,reload:CFG.reload,spread:.03,pellets:1,speed:640,life:1,startRes:0,pack:0,packCost:0,col:'#6fd3ff',len:1.8},
 smg:{name:'LIST',py:'list',rule:'MUTABLE + ORDERED: every shot is a pop(), and you can append() more ammo any time.',price:300,dmg:9,rate:.09,mag:30,reload:1.6,spread:.1,pellets:1,speed:660,life:.9,startRes:60,pack:30,packCost:40,col:'#39ff7a',len:1.5},
 shotgun:{name:'SET',py:'set',rule:'UNIQUE: no duplicates. Each enemy is hit only once per blast, so pellets pass on to the next target.',price:450,dmg:45,rate:.8,mag:6,reload:2,spread:.3,pellets:6,speed:600,life:.32,uniq:1,startRes:18,pack:12,packCost:45,col:'#ff9a3c',len:2},
 rifle:{name:'DICT',py:'dict',rule:'KEY: VALUE lookup. Damage is looked up by enemy type: heavy 1.6, elite 1.5, shooter 1.2, others 1.',price:600,dmg:22,rate:.14,mag:24,reload:1.8,spread:.04,pellets:1,speed:720,life:1,dict:{heavy:1.6,elite:1.5,shooter:1.2},startRes:72,pack:24,packCost:50,col:'#ffd54f',len:2.4},
 sniper:{name:'RANGE',py:'range',rule:'range(3) gives 0, 1, 2: one shot pierces 3 enemies, each hit once.',price:900,dmg:75,rate:1.1,mag:5,reload:2.4,spread:.01,pellets:1,speed:1000,life:1,pierce:3,startRes:20,pack:10,packCost:55,col:'#ff2e63',len:2.9}};
const GUNLEN=Object.fromEntries(Object.keys(WEAPONS).map(k=>[k,WEAPONS[k].len]));
const gun=()=>WEAPONS[(G&&G.p&&G.p.gun)||'pistol']||WEAPONS.pistol;
const othersAmmo=()=>{const p=G.p;return Object.keys(p.stash).some(id=>id!==p.gun&&p.stash[id].mag+p.stash[id].reserve>0)};
function outOfAmmo(){if(othersAmmo())msg('OUT OF AMMO - SWITCH WEAPON (E)');else PR.open('empty')}
function shoot(){const p=G.p,w=gun();if(p.rel>0||p.cd>0)return;
 if(p.mag<=0){msg('MAGAZINE EMPTY - PRESS R');if(!RULES[p.gun].immutable)Voice.event('reload');if(p.reserve<=0)outOfAmmo();p.cd=.4;return}
 if(!(SAVE.perks.eff&&Math.random()<.25))p.mag--;p.cd=w.rate;p.mf=.06;sfx('shoot');G.shots+=w.pellets;if(p.mag===Math.max(3,Math.floor(w.mag*.2))){msg('AMMO LOW');Voice.event('lowammo')}const uniq=new Set();   // set rule: one shared set per blast
 for(let i=0;i<w.pellets;i++){const a=p.a+rnd(-w.spread,w.spread);
  if(G.bul.length<200)G.bul.push({x:p.x+Math.cos(a)*16,y:p.y+Math.sin(a)*16,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,life:w.life,d:w.dmg,m:w.dict,pr:w.pierce||0,hs:w.uniq?uniq:(w.pierce?new Set():null)})}
 fxBurst(p.x+Math.cos(p.a)*18,p.y+Math.sin(p.a)*18,3,'#ffe38a',80);
 if(p.mag<=0&&RULES[p.gun].immutable)PR.open('empty')}   // an immutable weapon that runs dry pauses the game for its Python rule
function reload(){const p=G.p,w=gun();if(p.rel>0)return;if(p.mag>=w.mag)return msg('MAGAZINE FULL');
 if(RULES[p.gun].immutable){PR.open('violation');return}   // immutable ammo cannot be reloaded directly
 if(p.reserve<=0){if(p.mag<=0)outOfAmmo();else msg('NO RESERVE AMMO');return}
 p.rel=SAVE.perks.quick?w.reload*.5:w.reload;p.rt=p.rel;msg('RELOADING');
 G.fx.push({mg:1,x:p.x+Math.cos(p.a)*10,y:p.y+Math.sin(p.a)*10,vx:rnd(-30,30),vy:rnd(40,90),life:.8,max:.8,rot:rnd(0,6)})}   // spent magazine drops
/* ----- weapon switching and per-weapon ammo (p.stash holds the weapons that are not in hand) ----- */
function initGuns(){const p=G.p,g=SAVE.guns;p.gun='pistol';p.stash={pistol:{mag:p.mag,reserve:p.reserve}};
 g.owned=g.owned.filter(i=>WEAPONS[i]);if(!g.owned.includes('pistol'))g.owned.unshift('pistol');
 for(const id of g.owned)if(id!=='pistol'){const tot=g.res[id]||0,m=Math.min(WEAPONS[id].mag,tot);p.stash[id]={mag:m,reserve:tot-m}}
 if(g.sel!=='pistol'&&g.owned.includes(g.sel))switchGun(g.sel,true)}
function switchGun(id,quiet){const p=G.p;if(id===p.gun||!p.stash[id])return;p.rel=0;p.stash[p.gun]={mag:p.mag,reserve:p.reserve};
 const s=p.stash[id];p.mag=s.mag;p.reserve=s.reserve;p.gun=id;if(!quiet){p.cd=.25;msg(WEAPONS[id].name+' EQUIPPED')}}
function equipGun(id){if(!SAVE.guns.owned.includes(id))return;SAVE.guns.sel=id;switchGun(id)}
function ownedGuns(){return Object.keys(WEAPONS).filter(id=>SAVE.guns.owned.includes(id))}
function equipSlot(i){const l=ownedGuns();if(l[i])equipGun(l[i])}
function cycleGun(){const l=ownedGuns();equipGun(l[(l.indexOf(G.p.gun)+1)%l.length])}
function syncGuns(){const p=G&&G.p;if(!p||!p.stash)return;p.stash[p.gun]={mag:p.mag,reserve:p.reserve};const g=SAVE.guns;
 for(const id of g.owned)if(id!=='pistol'&&p.stash[id])g.res[id]=p.stash[id].mag+p.stash[id].reserve;g.sel=p.gun}
/* Python tuple rearm: the number the player typed becomes the pistol's ammo (1 to 24). Magazine first, then reserve. */
function pistolRearm(n){const p=G.p;n=clamp(Math.floor(+n||10),1,24);const s=p.gun==='pistol'?p:p.stash.pistol,fill=Math.min(WEAPONS.pistol.mag-s.mag,n);
 s.mag+=fill;s.reserve+=n-fill;if(p.gun!=='pistol')switchGun('pistol');return n}
