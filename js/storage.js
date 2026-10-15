"use strict";
/* storage.js - localStorage save/load with safe fallbacks */
/* ---------- SAVE ---------- */
let SAVE={best:0,lvl:1,kills:0,done:[],perks:{}};
try{const s=JSON.parse(localStorage.getItem('ghost')||'null');if(s&&typeof s==='object')Object.assign(SAVE,s)}catch(e){}
SAVE.done=Array.isArray(SAVE.done)?SAVE.done:[];SAVE.perks=SAVE.perks&&typeof SAVE.perks==='object'?SAVE.perks:{};
SAVE.name=typeof SAVE.name==='string'?SAVE.name.replace(/[\u0000-\u001f<>]/g,'').slice(0,12):'';SAVE.mute=!!SAVE.mute;SAVE.nomusic=!!SAVE.nomusic;
SAVE.vol=Object.assign({m:.7,s:.8,v:.9},SAVE.vol&&typeof SAVE.vol==='object'?SAVE.vol:{});['m','s','v'].forEach(k=>SAVE.vol[k]=Math.min(1,Math.max(0,+SAVE.vol[k]||0)));SAVE.voice=SAVE.voice!==false;SAVE.tips=SAVE.tips&&typeof SAVE.tips==='object'?SAVE.tips:{};SAVE.pr=Array.isArray(SAVE.pr)?SAVE.pr.filter(x=>typeof x==='string'):[];SAVE.tutDone=!!SAVE.tutDone;SAVE.mstyle=SAVE.mstyle==='cinema'?'cinema':'street';SAVE.voiceName=typeof SAVE.voiceName==='string'?SAVE.voiceName:'';
{const g=SAVE.guns&&typeof SAVE.guns==='object'?SAVE.guns:{};g.owned=Array.isArray(g.owned)?g.owned.filter(i=>typeof i==='string'):[];if(!g.owned.includes('pistol'))g.owned.unshift('pistol');
 g.res=g.res&&typeof g.res==='object'?g.res:{};g.sel=g.owned.includes(g.sel)?g.sel:'pistol';SAVE.guns=g;SAVE.credits=SAVE.credits==null?200:Math.max(0,+SAVE.credits||0)}SAVE.lvl=clamp(+SAVE.lvl||1,1,10);SAVE.best=+SAVE.best||0;SAVE.kills=+SAVE.kills||0;
const store=()=>{try{localStorage.setItem('ghost',JSON.stringify(SAVE))}catch(e){}};
