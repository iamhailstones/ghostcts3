"use strict";
/* utils.js - shared helpers: canvas handles, clamp, random */
const $=id=>document.getElementById(id),cv=$('c'),x=cv.getContext('2d'),W=900,H=600;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a);
