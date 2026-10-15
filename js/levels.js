"use strict";
/* levels.js - configuration: balance values, enemy types, level table, obstacles */
/* ---------- CONFIG (edit to rebalance) ---------- */
const CFG={hp:100,mag:30,reserve:48,bombs:5,maxBombs:9,speed:230,fuse:.8,blastR:115,blastDmg:100,dmg:15,fireRate:.22,reload:1.2};
const TYPES={
 grunt:{hp:30,sp:70,dmg:8,r:12,col:'#ff5a5a',pts:10},
 runner:{hp:20,sp:150,dmg:6,r:10,col:'#ffd93d',pts:15},
 shooter:{hp:40,sp:55,dmg:8,r:12,col:'#ff9f43',pts:20,range:260},
 heavy:{hp:150,sp:38,dmg:20,r:18,col:'#b24bf3',pts:40},
 elite:{hp:90,sp:90,dmg:12,r:14,col:'#ff2e63',pts:50,range:210,strafe:1}};
const LV=['RECRUIT','CONTACT','AMBUSH','BLACKOUT','HUNTER','PHANTOM','WARZONE','LAST STAND','GHOST PROTOCOL','THE COMMANDER'];
const COUNT=[5,8,12,16,20,25,30,35,40,0];
const POOL=[['grunt'],['grunt','runner'],['grunt','runner','shooter'],['grunt','shooter','heavy'],['grunt','shooter','runner','elite'],
 ['runner','shooter','heavy','elite'],['grunt','runner','shooter','heavy','elite'],['shooter','heavy','elite','runner'],['grunt','shooter','heavy','elite'],['grunt']];
const OBS=[{x:200,y:150,w:80,h:80},{x:620,y:380,w:100,h:70},{x:420,y:250,w:60,h:100},{x:90,y:420,w:90,h:50},{x:700,y:120,w:70,h:90}];
const TIPS=['Variables name values: ammo = 12.','if / else choose between two paths.','Lists keep order: ammo[0] is the first item.','Tuples cannot change, but list(t) makes an editable copy.','Dictionaries look a value up by its key: enemy["hp"].','for i in range(3) repeats three times.','def packages code you can reuse, and return gives a result back.','set() removes duplicates.','try / except stops an error from crashing your program.','You now know the basics: variables, lists, tuples, dicts, loops and functions.'];
const BRIEF=['5 recruits. Learn to move (WASD), aim, shoot and reload (R). Out of ammo? Python gets you rearmed.',
'8 soldiers, now with fast runners. Press C for a list challenge.','12 soldiers with ranged shooters. Use bombs (B) wisely.',
'16 soldiers including slow heavies. Ammo drops are rarer. Try loops and functions.','20 soldiers with elite fighters. Mix bombs, shield and Python rewards.',
'25 soldiers, faster and more aggressive. Manage ammo and bombs carefully.','30 soldiers in mixed waves. Use every ability you unlocked.',
'35 soldiers. Resources are scarce, so stay mobile.','40 soldiers in heavy formations. Prepare for the Commander.',
'THE COMMANDER. Three phases. In phase 3 his shield only falls to Python.'];
