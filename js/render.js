"use strict";
/* render.js - all canvas drawing: gritty tactical top-down look, dynamic lighting, tracers, and a military-style HUD */
/* visibility: characters and guns are drawn ~20% larger (30% on phones); the HUD blocks scale from their own corner, so the layout stays the same */
const VIS=()=>(typeof Orient!=='undefined'&&Orient.mobile)?1.3:1.2,HSCALE=()=>(typeof Orient!=='undefined'&&Orient.mobile)?1.28:1.12;
function circ(px,py,r,col){x.beginPath();x.arc(px,py,r,0,6.283);x.fillStyle=col;x.fill()}
const ENV=[[210,6,22],[95,14,22],[38,26,32],[215,25,15],[18,25,22],[200,10,38],[120,20,17],[0,16,19],[220,8,12],[355,26,14]];  // floor colour per level
const DARK=[.45,.5,.3,.7,.5,.35,.65,.58,.7,.55];                                                                              // how dark each level is
const BODY={player:['#3f5a3a','#2d4129','#1f2c1c'],grunt:['#5a3c3a','#3a2826','#2a1c1b'],runner:['#6b5b4a','#4a3f33','#33291f'],
 shooter:['#4c4f58','#33363e','#22252b'],heavy:['#3a2a2a','#262020','#161212'],elite:['#1c1c22','#101015','#0a0a0d'],boss:['#201418','#130b0e','#0a0507']};
let floorC=null,floorL=0,lightC=null;
function floorFor(l){if(floorC&&floorL===l)return floorC;
 const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),e=ENV[l-1];
 g.fillStyle='hsl('+e[0]+','+e[1]+'%,'+e[2]+'%)';g.fillRect(0,0,W,H);
 for(let i=0;i<600;i++){g.fillStyle='rgba('+(Math.random()<.5?'0,0,0':'255,255,255')+','+rnd(.02,.07)+')';g.fillRect(rnd(0,W),rnd(0,H),rnd(1,4),rnd(1,3))}
 for(let i=0;i<8;i++){const sx=rnd(0,W),sy=rnd(0,H),gr=g.createRadialGradient(sx,sy,0,sx,sy,rnd(40,90));gr.addColorStop(0,'rgba(0,0,0,.25)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(sx-100,sy-100,200,200)}
 g.lineWidth=2;for(let i=0;i<=W;i+=75){g.strokeStyle='rgba(0,0,0,.35)';g.beginPath();g.moveTo(i,0);g.lineTo(i,H);g.stroke();g.strokeStyle='rgba(255,255,255,.05)';g.beginPath();g.moveTo(i+2,0);g.lineTo(i+2,H);g.stroke()}
 for(let i=0;i<=H;i+=75){g.strokeStyle='rgba(0,0,0,.35)';g.beginPath();g.moveTo(0,i);g.lineTo(W,i);g.stroke();g.strokeStyle='rgba(255,255,255,.05)';g.beginPath();g.moveTo(0,i+2);g.lineTo(W,i+2);g.stroke()}
 g.strokeStyle='rgba(230,190,40,.45)';g.lineWidth=6;g.setLineDash([22,16]);g.strokeRect(14,14,W-28,H-28);g.setLineDash([]);
 g.fillStyle='rgba(255,255,255,.06)';g.font='900 90px Impact,"Arial Black",sans-serif';g.textAlign='center';g.fillText('SECTOR '+String(l).padStart(2,'0'),W/2,H/2+30);
 floorC=c;floorL=l;return c}
function crate(b){x.fillStyle='rgba(0,0,0,.5)';x.fillRect(b.x+7,b.y+9,b.w,b.h);x.fillStyle='#3a3f33';x.fillRect(b.x,b.y,b.w,b.h);
 x.fillStyle='rgba(255,255,255,.09)';x.fillRect(b.x,b.y,b.w,4);x.fillRect(b.x,b.y,4,b.h);
 x.strokeStyle='#161912';x.lineWidth=3;x.strokeRect(b.x+1.5,b.y+1.5,b.w-3,b.h-3);
 x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=2;x.beginPath();x.moveTo(b.x,b.y);x.lineTo(b.x+b.w,b.y+b.h);x.moveTo(b.x+b.w,b.y);x.lineTo(b.x,b.y+b.h);x.stroke();
 x.fillStyle='rgba(215,185,60,.6)';x.fillRect(b.x+6,b.y+6,12,3)}
/* Ghost only: shoulder armour, magazine pouches, gloved hands and a radio on the body; rim, ear defenders and night-vision mount on the helmet */
function humanBody(r){x.fillStyle='#232a1f';[-1,1].forEach(s=>{x.beginPath();x.ellipse(0,s*r*.98,r*.3,r*.2,0,0,6.283);x.fill()});
 x.fillStyle='#1b2118';[-1,1].forEach(s=>x.fillRect(r*.28,s*r*.34-r*.1,r*.2,r*.2));circ(r,-r*.12,r*.2,'#15171a');circ(r*1.45,r*.12,r*.2,'#15171a');
 x.strokeStyle='#15171a';x.lineWidth=1.5;x.beginPath();x.moveTo(-r*.9,-r*.35);x.lineTo(-r*1.5,-r*.9);x.stroke()}
function humanHead(r){x.strokeStyle='#0d100c';x.lineWidth=2;x.beginPath();x.arc(r*.1,0,r*.6,-1.2,1.2);x.stroke();circ(r*.1,-r*.58,r*.14,'#1a1f17');circ(r*.1,r*.58,r*.14,'#1a1f17');
 x.fillStyle='#4a5a40';x.fillRect(-r*.25,-r*.15,r*.3,r*.3);x.fillStyle='#101310';x.fillRect(r*.5,-r*.12,r*.14,r*.24)}
function soldier(px,py,r,a,o){r*=VIS();
 const c=BODY[o.type]||BODY.grunt,hit=o.flash>0,body=hit?'#fff':c[0],helm=hit?'#fff':c[1],vest=hit?'#fff':c[2],gl=o.gl||((o.type==='shooter'||o.type==='elite')?2.3:1.8);
 x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.ellipse(px+4,py+r*.8+4,r,r*.55,0,0,6.283);x.fill();
 x.save();x.translate(px,py);x.rotate(a);x.lineCap='round';
 const w=Math.sin(T*12+px*.1)*(o.mv?r*.28:0);
 x.fillStyle='#14170f';x.beginPath();x.ellipse(w,-r*.4,r*.5,r*.24,0,0,6.283);x.ellipse(-w,r*.4,r*.5,r*.24,0,0,6.283);x.fill();
 if(o.type==='boss'){x.fillStyle='rgba(120,10,25,.75)';x.beginPath();x.moveTo(-r*.4,-r*1.3);x.lineTo(-r*1.9,0);x.lineTo(-r*.4,r*1.3);x.closePath();x.fill()}
 x.fillStyle=vest;x.fillRect(-r,-r*.5,r*.5,r);
 x.fillStyle=body;x.beginPath();x.ellipse(0,0,r*.72,r,0,0,6.283);x.fill();
 x.fillStyle=vest;x.beginPath();x.ellipse(r*.05,0,r*.52,r*.72,0,0,6.283);x.fill();
 x.fillStyle='rgba(255,255,255,.1)';x.fillRect(r*.2,-r*.45,r*.14,r*.9);
 if(o.type==='heavy'||o.type==='boss'){circ(0,-r*.95,r*.32,'#4a4f55');circ(0,r*.95,r*.32,'#4a4f55')}
 if(o.col){x.fillStyle=o.col;x.fillRect(-r*.1,-r*1.02,r*.28,r*.22)}
 x.strokeStyle=body;x.lineWidth=r*.36;x.beginPath();x.moveTo(r*.1,-r*.8);x.lineTo(r,-r*.12);x.moveTo(r*.1,r*.8);x.lineTo(r*1.45,r*.12);x.stroke();
 x.fillStyle='#101318';x.fillRect(-r*.1,-r*.18,r*.35,r*.36);x.fillRect(r*.1,-r*.13,r*gl,r*.26);x.fillRect(r*gl*.9,-r*.06,r*.7,r*.12);
 x.fillStyle=o.type==='player'?'#6fd3ff':'#555a60';x.fillRect(r*.7,-r*.2,r*.35,r*.12);
 if(o.type==='shooter'||o.type==='elite'){x.strokeStyle='rgba(255,40,40,.25)';x.lineWidth=1;x.beginPath();x.moveTo(r*(gl+.8),0);x.lineTo(r*(gl+.8)+70,0);x.stroke()}
 if(o.mf>0){const mx=r*(.1+gl+.7);x.fillStyle='#ffe9a0';x.beginPath();x.moveTo(mx,0);for(let i=0;i<8;i++){const ang=i*.785,rad=i%2?r*.5:r*1.3;x.lineTo(mx+Math.cos(ang)*rad,Math.sin(ang)*rad)}x.closePath();x.fill()}
 if(o.type==='player')humanBody(r);
 x.fillStyle=helm;x.beginPath();x.arc(r*.1,0,r*.6,0,6.283);x.fill();
 x.strokeStyle='rgba(255,255,255,.18)';x.lineWidth=2;x.beginPath();x.arc(r*.1,0,r*.6,-2.4,-.8);x.stroke();
 if(o.type==='player')humanHead(r);
 x.fillStyle=o.type==='player'?'#6fd3ff':(o.type==='elite'||o.type==='boss')?'#ff3040':o.type==='heavy'?'#a02020':'#1a1d22';
 x.shadowColor=x.fillStyle;x.shadowBlur=o.type==='player'||o.type==='elite'||o.type==='boss'?10:0;x.fillRect(r*.52,-r*.36,r*.16,r*.72);x.shadowBlur=0;
 x.restore()}
function draw(){x.clearRect(0,0,W,H);if(!G)return;const p=G.p;
 x.save();if(G.shake>0)x.translate(rnd(-5,5)*G.shake*2,rnd(-5,5)*G.shake*2);
 x.drawImage(floorFor(G.lvl),0,0);
 for(const d of G.decals){const g=x.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.arc(d.x,d.y,d.r,0,6.283);x.fill()}
 for(const b of OBS.slice(0,Math.min(5,2+(G.lvl>>1))))crate(b);
 for(const k of G.pk){const c={a:'#d9b640',h:'#e8e8e8',b:'#7e8f5a',s:'#4aa3d9'}[k.k],by=k.y+Math.sin(T*4+k.x)*2;
  x.strokeStyle=c;x.globalAlpha=.4+.3*Math.sin(T*6);x.lineWidth=2;x.beginPath();x.arc(k.x,by,17,0,6.283);x.stroke();x.globalAlpha=1;
  x.fillStyle='#1b1f19';x.fillRect(k.x-10,by-8,20,16);x.fillStyle=c;x.fillRect(k.x-8,by-6,16,12);x.fillStyle='#111';x.font='bold 11px "Courier New",monospace';x.textAlign='center';x.fillText({a:'A',h:'+',b:'G',s:'S'}[k.k],k.x,by+4)}
 for(const e of G.enemies){const a=Math.atan2(p.y-e.y,p.x-e.x);soldier(e.x,e.y,e.r,a,{type:e.type,flash:e.flash,mv:1,col:e.t.col});
  if(e.shield){x.strokeStyle='#6fd3ff';x.lineWidth=3;x.shadowColor='#6fd3ff';x.shadowBlur=14;x.beginPath();x.arc(e.x,e.y,e.r+8+Math.sin(T*10)*2,0,6.283);x.stroke();x.shadowBlur=0}
  if((e.hp<e.max||SAVE.perks.scan)&&!e.boss){x.fillStyle='rgba(0,0,0,.6)';{const R=e.r*VIS();x.fillRect(e.x-R,e.y-R-12,R*2,4);x.fillStyle='#d9473a';x.fillRect(e.x-R,e.y-R-12,R*2*Math.max(0,e.hp/e.max),4)}}}
 for(const b of G.bombs){circ(b.x,b.y,9,'#4b5538');circ(b.x,b.y,4,'#2a3020');x.strokeStyle=Math.floor(b.t*10)%2?'#ff3b3b':'#d9b640';x.lineWidth=2;x.beginPath();x.arc(b.x,b.y,9+Math.sin(T*30),0,6.283);x.stroke()}
 x.lineCap='round';
 for(const b of G.bul){x.strokeStyle='rgba(255,170,60,.45)';x.lineWidth=5;x.beginPath();x.moveTo(b.x-b.vx*.05,b.y-b.vy*.05);x.lineTo(b.x,b.y);x.stroke();x.strokeStyle='#fff3c0';x.lineWidth=2;x.beginPath();x.moveTo(b.x-b.vx*.03,b.y-b.vy*.03);x.lineTo(b.x,b.y);x.stroke()}
 for(const b of G.eb){x.strokeStyle='rgba(255,70,40,.9)';x.lineWidth=3;x.beginPath();x.moveTo(b.x-b.vx*.04,b.y-b.vy*.04);x.lineTo(b.x,b.y);x.stroke()}
 for(const f of G.fx){
  if(f.ring){const t=1-f.life/f.max,R=Math.max(1,f.R*t),g=x.createRadialGradient(f.x,f.y,0,f.x,f.y,R);g.addColorStop(0,'rgba(255,230,150,'+(1-t)*.9+')');g.addColorStop(.5,'rgba(255,120,30,'+(1-t)*.6+')');g.addColorStop(1,'rgba(40,20,10,0)');
   x.fillStyle=g;x.beginPath();x.arc(f.x,f.y,R,0,6.283);x.fill();x.strokeStyle='rgba(255,255,255,'+(1-t)*.5+')';x.lineWidth=3;x.beginPath();x.arc(f.x,f.y,R,0,6.283);x.stroke()}
  else if(f.mg){x.save();x.translate(f.x,f.y);x.rotate(f.rot+T*6);x.globalAlpha=Math.min(1,f.life*2);x.fillStyle='#1a1d22';x.fillRect(-3,-5,6,10);x.strokeStyle='#d9b640';x.lineWidth=1;x.strokeRect(-3,-5,6,10);x.restore();x.globalAlpha=1}
  else if(f.sm){const t=1-f.life/f.max;x.globalAlpha=(1-t)*.5;circ(f.x,f.y,f.r*(1+t*1.5),'#2a2a2a');x.globalAlpha=1}
  else{x.globalAlpha=Math.min(1,f.life*2.5);x.strokeStyle=f.col;x.lineWidth=f.big?3:1.5;x.beginPath();x.moveTo(f.x,f.y);x.lineTo(f.x-f.vx*.04,f.y-f.vy*.04);x.stroke();x.globalAlpha=1}}
 soldier(p.x,p.y,p.r,p.a,{type:'player',mv:p.mv,flash:p.hurt>.15?1:0,mf:p.mf,gl:GUNLEN[p.gun]});
 if(p.sh>0){x.strokeStyle='#4aa3d9';x.lineWidth=2;x.shadowColor='#4aa3d9';x.shadowBlur=12;x.beginPath();x.arc(p.x,p.y,p.r+8+Math.sin(T*12),0,6.283);x.stroke();x.shadowBlur=0}
 if(G.hitT>0){x.strokeStyle='rgba(255,40,40,'+Math.min(1,G.hitT)+')';x.lineWidth=10;x.beginPath();x.arc(p.x,p.y,50,G.hitA-.5,G.hitA+.5);x.stroke()}
 {const nm=SAVE.name||'GHOST',ty=Math.max(24,p.y-p.r*VIS()-22);x.font='700 12px "Courier New",monospace';x.textAlign='center';x.lineWidth=3;x.strokeStyle='rgba(0,0,0,.8)';x.strokeText(nm,p.x,ty);x.fillStyle='#e8f0e0';x.fillText(nm,p.x,ty)}
 x.restore();
 /* lighting: darkness with a flashlight cone, muzzle flash and explosion light */
 if(!lightC){lightC=document.createElement('canvas');lightC.width=W;lightC.height=H}
 const L=lightC.getContext('2d');L.globalCompositeOperation='source-over';L.clearRect(0,0,W,H);L.fillStyle='rgba(2,4,8,'+DARK[G.lvl-1]+')';L.fillRect(0,0,W,H);L.globalCompositeOperation='destination-out';
 const hole=(px,py,R,al)=>{const g=L.createRadialGradient(px,py,R*.08,px,py,R);g.addColorStop(0,'rgba(0,0,0,'+al+')');g.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=g;L.beginPath();L.arc(px,py,R,0,6.283);L.fill()};
 hole(p.x,p.y,250,1);L.save();L.translate(p.x,p.y);L.rotate(p.a);{const g=L.createRadialGradient(0,0,20,0,0,540);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=g;L.beginPath();L.moveTo(0,0);L.arc(0,0,540,-.42,.42);L.closePath();L.fill()}L.restore();
 if(p.mf>0)hole(p.x+Math.cos(p.a)*30,p.y+Math.sin(p.a)*30,140,.9);
 for(const f of G.fx)if(f.ring)hole(f.x,f.y,f.R*1.4*(1-f.life/f.max)+30,Math.max(0,f.life/f.max));
 x.drawImage(lightC,0,0);
 const v=x.createRadialGradient(W/2,H/2,H*.4,W/2,H/2,H*.9);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.6)');x.fillStyle=v;x.fillRect(0,0,W,H);
 if(p.hurt>0){x.fillStyle='rgba(200,20,30,'+Math.min(.3,p.hurt)+')';x.fillRect(0,0,W,H)}
 if(G.flash>0){x.fillStyle='rgba(255,235,190,'+Math.min(.45,G.flash*1.8)+')';x.fillRect(0,0,W,H)}
 hudCanvas(p);crosshair(p);
}
function crosshair(p){const cx=M.x,cy=M.y,sp=(p.cd>0?7:0)+(p.rel>0?9:0);x.strokeStyle='rgba(235,240,230,.9)';x.lineWidth=2;x.lineCap='butt';
 for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){x.beginPath();x.moveTo(cx+a*(6+sp),cy+b*(6+sp));x.lineTo(cx+a*(14+sp),cy+b*(14+sp));x.stroke()}circ(cx,cy,1.5,'#fff');if(p.rel>0&&p.rt){x.strokeStyle='#39ff7a';x.lineWidth=3;x.beginPath();x.arc(cx,cy,22,-1.571,-1.571+6.283*(1-p.rel/p.rt));x.stroke()}
 const mk=(col,s,t)=>{x.strokeStyle=col;x.lineWidth=t;for(const[a,b]of[[1,1],[-1,1],[1,-1],[-1,-1]]){x.beginPath();x.moveTo(cx+a*5,cy+b*5);x.lineTo(cx+a*s,cy+b*s);x.stroke()}};
 if(G.hm>0)mk('#fff',12,2.5);if(G.kt>0)mk('#ff3b3b',16,3.5)}
function hudCanvas(p){x.textBaseline='alphabetic';const hs=HSCALE();
 const hp=Math.max(0,p.hp/CFG.hp),big='900 34px Impact,"Arial Black",sans-serif',mono='11px "Courier New",monospace';
 x.save();x.translate(0,H);x.scale(hs,hs);x.translate(0,-H);x.fillStyle='rgba(0,0,0,.5)';x.fillRect(14,H-70,250,58);x.textAlign='left';x.fillStyle='#e6ecdc';x.font=big;x.fillText(Math.ceil(Math.max(0,p.hp)),24,H-22);
 x.font=mono;x.fillStyle='#9aa593';x.fillText('HEALTH'+(p.sh>0?'  +ARMOR':''),24,H-54);
 for(let i=0;i<10;i++){x.fillStyle=i<Math.ceil(hp*10)?(hp<.3?'#e0443a':'#d9e0cf'):'rgba(255,255,255,.12)';x.fillRect(96+i*15,H-42,11,18)}
 x.restore();
 x.save();x.translate(W,H);x.scale(hs,hs);x.translate(-W,-H);x.fillStyle='rgba(0,0,0,.5)';x.fillRect(W-264,H-84,250,72);gunSprite(x,p.gun||'pistol',W-258,H-82,66,24);x.textAlign='right';x.fillStyle=p.mag<=3?'#e0443a':'#f1f5ea';x.font='900 52px Impact,"Arial Black",sans-serif';x.fillText(p.mag,W-100,H-30);
 x.font='900 24px Impact,"Arial Black",sans-serif';x.fillStyle='#aeb7a4';x.fillText('/ '+p.reserve,W-24,H-30);x.font=mono;x.fillStyle='#9aa593';x.fillText(gun().name+'  |  '+(p.rel>0?'RELOADING':'READY'),W-24,H-72);
 for(let i=0;i<p.bombs;i++)circ(W-250+i*16,H-20,5,'#8a9a6a');
 x.textAlign='left';x.font='11px "Courier New",monospace';x.fillStyle='#9aa593';x.fillText('x'+p.bombs,W-250+Math.max(p.bombs,1)*16+2,H-16);
 if(p.rel>0&&p.rt){x.fillStyle='rgba(255,255,255,.15)';x.fillRect(W-244,H-16,150,3);x.fillStyle='#fff';x.fillRect(W-244,H-16,150*(1-p.rel/p.rt),3)}
 x.restore();
 x.save();x.translate(W/2,0);x.scale(hs,hs);x.translate(-W/2,0);const left=(G.total-G.spawned)+G.enemies.length;x.textAlign='center';x.fillStyle='#eef2e8';x.font='900 18px Impact,"Arial Black",sans-serif';
 x.fillText(G.boss?'ELIMINATE THE COMMANDER':'HOSTILES REMAINING  '+left,W/2,26);x.font=mono;x.fillStyle='#9aa593';x.fillText((G.boss?'':'WAVE '+G.wave+'/'+G.waves+'   |   ')+'SCORE '+score+'   |   KILLS '+kills,W/2,44);
 if(G.combo>1&&G.comboT>0){x.fillStyle='#ffd54f';x.font='900 22px Impact,"Arial Black",sans-serif';x.fillText(['DOUBLE KILL','TRIPLE KILL','MULTI KILL'][Math.min(G.combo,4)-2],W/2,74)}
 if(G.boss&&G.enemies.includes(G.boss)){x.fillStyle='rgba(0,0,0,.6)';x.fillRect(W/2-210,84,420,10);x.fillStyle='#c0392b';x.fillRect(W/2-210,84,420*Math.max(0,G.boss.hp/G.boss.max),10);x.fillStyle='#eee';x.font=mono;x.fillText('THE COMMANDER  -  PHASE '+G.boss.ph,W/2,110)}
 x.restore();
 x.save();x.translate(W,0);x.scale(hs,hs);x.translate(-W,0);x.textAlign='right';x.font='12px "Courier New",monospace';G.feed.forEach((f,i)=>{x.globalAlpha=Math.min(1,f.life);x.fillStyle='#d6dccb';x.fillText(f.txt,W-16,(G.boss?132:100)+i*18)});x.globalAlpha=1;x.restore();
 x.save();x.scale(hs,hs);const mx=82,my=88,R=62,s=.13;x.save();x.beginPath();x.arc(mx,my,R,0,6.283);x.clip();x.fillStyle='rgba(6,14,9,.7)';x.fillRect(mx-R,my-R,R*2,R*2);
 x.strokeStyle='rgba(120,200,140,.18)';x.lineWidth=1;x.beginPath();x.arc(mx,my,R/2,0,6.283);x.moveTo(mx-R,my);x.lineTo(mx+R,my);x.moveTo(mx,my-R);x.lineTo(mx,my+R);x.stroke();
 x.fillStyle='rgba(120,130,110,.5)';for(const b of OBS.slice(0,Math.min(5,2+(G.lvl>>1))))x.fillRect(mx+(b.x-p.x)*s,my+(b.y-p.y)*s,b.w*s,b.h*s);
 for(const e of G.enemies){let dx=(e.x-p.x)*s,dy=(e.y-p.y)*s;const d=Math.hypot(dx,dy);if(d>R-4){dx*=(R-4)/d;dy*=(R-4)/d}circ(mx+dx,my+dy,e.boss?4:2.6,'#ff4040')}
 x.translate(mx,my);x.rotate(p.a);x.fillStyle='#6cf08a';x.beginPath();x.moveTo(7,0);x.lineTo(-5,-4.5);x.lineTo(-5,4.5);x.closePath();x.fill();x.restore();
 x.strokeStyle='rgba(180,220,190,.6)';x.lineWidth=2;x.beginPath();x.arc(mx,my,R,0,6.283);x.stroke();x.restore()}
