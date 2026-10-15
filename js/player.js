"use strict";
/* player.js - player damage and special abilities */
function hurtPlayer(d,src){const p=G.p;if(p.hurt>0&&d<30)return;p.hp-=p.sh>0?d*.3:d;p.hurt=.25;sfx('hit');if(src){G.hitA=Math.atan2(src.y-p.y,src.x-p.x);G.hitT=.9}G.shake=Math.max(G.shake,.15);
 if(p.hp>0&&p.hp<=CFG.hp*.15&&!G.critHp){G.critHp=1;msg('HEALTH CRITICAL');Voice.event('critical')}else if(p.hp>0&&p.hp<=CFG.hp*.3&&!G.lowHp){G.lowHp=1;msg('HEALTH LOW');Voice.event('lowhp')}
 if(p.hp<=0){state='end';Voice.event('lose');Music.stinger('lose');SAVE.best=Math.max(SAVE.best,score);syncGuns();store();showEnd('GAME OVER','Score '+score+' | Level '+G.lvl,'RETRY LEVEL',()=>newLevel(G.lvl))}}
function phantomStrike(){const p=G.p;if(!SAVE.perks.strike)msg('SOLVE THE FUNCTION CHALLENGE (C)');else if(p.sk>0)msg('STRIKE RECHARGING');else{p.sk=8;msg('PHANTOM STRIKE');explode(p.x,p.y,190,70,0)}}
function nextChallenge(){const i=CH.findIndex((c,j)=>j<=G.lvl+1&&!SAVE.done.includes(c.id));if(i<0)msg(SAVE.done.length>=CH.length?'ALL CHALLENGES SOLVED':'NO NEW CHALLENGES YET - CLEAR THIS LEVEL');else openCh(i,false)}
