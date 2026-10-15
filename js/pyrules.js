"use strict";
/* pyrules.js - Python rules for the weapons and lessons.
   1) Py: a small interpreter for simple Python statements (assignments, indexing, list/tuple/set/dict/range and their methods).
      It only runs the weapon console's own tiny subset - never arbitrary code - and raises real Python error messages.
   2) pySyntax: indentation and block-structure checks for the lessons (not a full Python parser).
   3) PR: the blocking "Python rule" console. While it is open the game state is 'pyr', so nothing in the world updates. */
class PyErr extends Error{constructor(t,m){super(t+': '+m);this.py=t}}
const PT=a=>({t:'tuple',v:a}),Ls=a=>({t:'list',v:a}),St=a=>({t:'set',v:new Set(a)}),Rg=(a,b)=>({t:'range',a,b});
const tname=v=>typeof v==='number'?'int':typeof v==='string'?'str':v.t;
const pitems=v=>v.t==='set'?[...v.v]:v.t==='dict'?[...v.v.keys()]:v.t==='range'?Array.from({length:Math.max(0,v.b-v.a)},(_,i)=>v.a+i):v.v;
function fmt(v){if(typeof v==='number')return String(v);if(typeof v==='string')return JSON.stringify(v);const j=a=>a.map(fmt).join(', ');
 switch(v.t){case'tuple':return'('+j(v.v)+(v.v.length===1?',':'')+')';case'list':return'['+j(v.v)+']';case'set':return v.v.size?'{'+j([...v.v])+'}':'set()';
  case'dict':return'{'+[...v.v].map(([k,x])=>fmt(k)+': '+fmt(x)).join(', ')+'}';case'range':return'range('+v.a+', '+v.b+')'}}
const Py={
 tok(s){const out=[],re=/\s*(?:(\d+)|([A-Za-z_]\w*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\+=|-=|==|[-+*()\[\]{},:.=]))/y;let m;
  while(re.lastIndex<s.length&&(m=re.exec(s))){if(m[1]!==undefined)out.push({n:+m[1]});else if(m[2])out.push({id:m[2]});else if(m[3])out.push({s:m[3].slice(1,-1)});else out.push({o:m[4]})}
  if(s.slice(re.lastIndex).trim())throw new PyErr('SyntaxError','invalid syntax');return out},
 name(id,env){if(!(id in env))throw new PyErr('NameError',"name '"+id+"' is not defined");return env[id]},
 get(v,i){const t=tname(v);if(t==='dict'){if(!v.v.has(i))throw new PyErr('KeyError',fmt(i));return v.v.get(i)}
  if(t==='list'||t==='tuple'||t==='range'){if(typeof i!=='number')throw new PyErr('TypeError',t+' indices must be integers');const a=pitems(v),k=i<0?a.length+i:i;if(k<0||k>=a.length)throw new PyErr('IndexError',t+' index out of range');return a[k]}
  throw new PyErr('TypeError',"'"+t+"' object is not subscriptable")},
 set(v,i,x){const t=tname(v);if(t==='dict'){v.v.set(i,x);return}
  if(t==='list'){const k=i<0?v.v.length+i:i;if(typeof i!=='number'||k<0||k>=v.v.length)throw new PyErr('IndexError','list assignment index out of range');v.v[k]=x;return}
  throw new PyErr('TypeError',"'"+t+"' object does not support item assignment")},
 arith(op,a,b){const ta=tname(a),tb=tname(b);
  if(ta==='int'&&tb==='int')return op==='+'?a+b:op==='-'?a-b:a*b;
  if(op==='+'&&ta===tb&&(ta==='list'||ta==='tuple'))return{t:ta,v:a.v.concat(b.v)};
  if(op==='*'&&ta==='list'&&tb==='int')return Ls(Array(Math.max(0,b)).fill(0).flatMap(()=>a.v));
  throw new PyErr('TypeError','unsupported operand type(s) for '+op+": '"+ta+"' and '"+tb+"'")},
 fn(n,a){switch(n){case'list':return Ls(a.length?pitems(a[0]).slice():[]);case'tuple':return PT(a.length?pitems(a[0]).slice():[]);case'set':return St(a.length?pitems(a[0]):[]);
  case'len':return pitems(a[0]).length;case'int':return typeof a[0]==='number'?a[0]:parseInt(a[0],10);case'range':return a.length>1?Rg(a[0],a[1]):Rg(0,a[0]);case'print':return 0}
  throw new PyErr('NameError',"name '"+n+"' is not defined")},
 method(v,n,a){const t=tname(v),no=()=>{throw new PyErr('AttributeError',"'"+t+"' object has no attribute '"+n+"'")};
  if(t==='list'){if(n==='append'){v.v.push(a[0]);return 0}if(n==='pop')return v.v.pop();if(n==='extend'){v.v.push(...pitems(a[0]));return 0}
   if(n==='remove'){const k=v.v.indexOf(a[0]);if(k<0)throw new PyErr('ValueError','list.remove(x): x not in list');v.v.splice(k,1);return 0}no()}
  if(t==='set'){if(n==='add'){v.v.add(a[0]);return 0}if(n==='discard'){v.v.delete(a[0]);return 0}if(n==='update'){pitems(a[0]).forEach(x=>v.v.add(x));return 0}
   if(n==='remove'){if(!v.v.delete(a[0]))throw new PyErr('KeyError',fmt(a[0]));return 0}no()}
  if(t==='dict'&&n==='get')return v.v.has(a[0])?v.v.get(a[0]):0;no()},
 ev(tk,env){let p=0;const isO=o=>tk[p]&&tk[p].o===o,eat=o=>{if(!isO(o))throw new PyErr('SyntaxError','invalid syntax');p++};
  const args=()=>{const a=[];while(!isO(')')){a.push(expr());if(isO(','))p++;else break}return a};
  const atom=()=>{const t=tk[p++];if(!t)throw new PyErr('SyntaxError','invalid syntax');let v;
   if(t.n!==undefined)v=t.n;else if(t.s!==undefined)v=t.s;
   else if(t.id){if(isO('(')){p++;const a=args();eat(')');v=Py.fn(t.id,a)}else v=Py.name(t.id,env)}
   else if(t.o==='('){if(isO(')')){p++;v=PT([])}else{const f=expr();if(isO(',')){const a=[f];while(isO(',')){p++;if(isO(')'))break;a.push(expr())}eat(')');v=PT(a)}else{eat(')');v=f}}}
   else if(t.o==='['){const a=[];while(!isO(']')){a.push(expr());if(isO(','))p++;else break}eat(']');v=Ls(a)}
   else if(t.o==='{'){const a=[],m=new Map();let d=false;while(!isO('}')){const k=expr();if(isO(':')){p++;d=true;m.set(k,expr())}else a.push(k);if(isO(','))p++;else break}eat('}');v=d?{t:'dict',v:m}:St(a)}
   else throw new PyErr('SyntaxError','invalid syntax');
   for(;;){if(isO('[')){p++;const i=expr();eat(']');v=Py.get(v,i)}
    else if(isO('.')){p++;const n=tk[p++];if(!n||!n.id)throw new PyErr('SyntaxError','invalid syntax');if(isO('(')){p++;const a=args();eat(')');v=Py.method(v,n.id,a)}else throw new PyErr('AttributeError',"'"+tname(v)+"' object has no attribute '"+n.id+"'")}else break}return v};
  const term=()=>{let v=atom();while(isO('*')){p++;v=Py.arith('*',v,atom())}return v};
  const expr=()=>{let v=term();while(isO('+')||isO('-')){const o=tk[p++].o;v=Py.arith(o,v,term())}return v};
  const r=expr();if(p<tk.length)throw new PyErr('SyntaxError','invalid syntax');return r},
 stmt(tk,env){let d=0,at=-1,op='';tk.forEach((t,i)=>{if('([{'.includes(t.o||' '))d++;else if(')]}'.includes(t.o||' '))d--;else if(d===0&&at<0&&(t.o==='='||t.o==='+='||t.o==='-=')){at=i;op=t.o}});
  if(at<0){Py.ev(tk,env);return}
  const L=tk.slice(0,at),R=Py.ev(tk.slice(at+1),env),ap=old=>op==='='?R:Py.arith(op==='+='?'+':'-',old,R);
  if(L.length===1&&L[0].id){env[L[0].id]=ap(op==='='?0:Py.name(L[0].id,env));return}
  if(L.length>=4&&L[0].id&&L[1].o==='['&&L[L.length-1].o===']'){const g=Py.name(L[0].id,env),i=Py.ev(L.slice(2,-1),env);Py.set(g,i,ap(op==='='?0:Py.get(g,i)));return}
  throw new PyErr('SyntaxError','cannot assign to this expression')},
 run(code,env){code.split('\n').forEach((l0,i)=>{const l=l0.replace(/#.*$/,'');if(!l.trim())return;
  if(/^\s/.test(l))throw new PyErr('IndentationError','unexpected indent on line '+(i+1));
  if(/^(if|for|while|def|class|try|else|elif|except)\b/.test(l.trim()))throw new PyErr('SyntaxError','this console runs single statements (line '+(i+1)+')');
  Py.stmt(Py.tok(l),env)})}};
/* Context-aware indentation check (4 spaces per block level). It reads the code's structure with the PyIndent tokenizer (strings, comments, brackets),
   so lines continued inside brackets are free, and every message says the line, the spaces found, the spaces expected and how to fix it.
   Simple statements at the left margin (ammo = 12) are valid. This checks layout and block structure; real syntax errors come from PyEngine. */
function pySyntax(code){const raw=code.split('\n'),S=PyIndent.scan(code).lines,stack=[0],kind=[''],last={0:''};let expect=false,hdr=0,hk='';
 const H=/^(if|elif|else|for|while|def|class|try|except|finally|with)$/,KIND={def:'function',class:'class',if:'if block',elif:'if block',else:'else block',for:'loop',while:'loop',try:'try block',except:'except block',finally:'finally block',with:'with block'};
 for(let i=0;i<S.length;i++){const ln=S[i];if(ln.cont||!ln.code)continue;
  let code2=ln.code;for(let j=i+1;j<S.length&&S[j].cont;j++)code2+=' '+S[j].code;                          // a statement continued over several lines
  const n=i+1,ind=ln.indent,top=stack[stack.length-1],kw=PyIndent.kw(code2);
  if(/^ *\t|^\t/.test(raw[i]))return'Indentation error on line '+n+': this line is indented with a tab. Use 4 spaces for each block level (do not mix tabs and spaces).';
  if(expect){const want=top+4;if(ind!==want)return'Indentation error on line '+n+': expected '+want+' leading spaces inside the '+KIND[hk]+' started on line '+hdr+' (4 spaces per level), but found '+ind+'. '+(ind<want?'Add '+(want-ind)+' space(s).':'Remove '+(ind-want)+' space(s).');stack.push(ind);kind.push(hk);last[ind]='';expect=false}
  else if(ind>top)return'Indentation error on line '+n+': expected '+top+' leading spaces (this line is not inside a new block), but found '+ind+'. Remove '+(ind-top)+' space(s).';
  else{while(ind<stack[stack.length-1]){delete last[stack.pop()];kind.pop()}if(ind!==stack[stack.length-1])return'Indentation error on line '+n+': found '+ind+' leading spaces, which does not line up with any enclosing block (expected one of '+stack.join(', ')+').'}
  const prev=last[ind]||'';
  if((kw==='else'||kw==='elif')&&!/^(if|elif|for|while|try|except)$/.test(prev))return'Syntax error on line '+n+': "'+kw+'" must line up with the "if" it belongs to ('+ind+' spaces), but no matching "if" is at this level.';
  if((kw==='except'||kw==='finally')&&!/^(try|except)$/.test(prev))return'Syntax error on line '+n+': "'+kw+'" must line up with its "try".';
  if(H.test(kw)){if(!/:/.test(code2))return'Syntax error on line '+n+': this "'+kw+'" line needs a colon (:) at the end.';if(/:\s*$/.test(code2)){expect=true;hdr=n;hk=kw}}
  last[ind]=H.test(kw)?kw:'stmt'}
 if(expect)return'Indentation error: expected an indented block after line '+hdr+' (add the body with 4 more spaces).';return''}
/* ---------- weapon rules ---------- */
const bad=m=>{throw new PyErr('RuleError',m)};
/* "ADD AMMO" loads the magazine from the reserve when there is reserve, otherwise it is a bonus refill */
const load=(a,r,b)=>{const n=b.reserve>0?Math.min(b.cap,b.reserve):b.cap;return a+' = '+n+(b.reserve>0?'\n'+r+' = '+r+' - '+n:'')};
const RULES={
 pistol:{kind:'tuple',v:'ammo',immutable:1,make:(m,r)=>PT([m,r]),lesson:'tuple',intro:'Its ammo is a tuple: ammo = (magazine, reserve). A tuple is immutable, so its items cannot be changed directly.',
  why:'A tuple cannot change after it is created, so ammo[0] = 12 raises TypeError. To "change" it, make a list copy with list(ammo), edit the list (ammo[0] = 12), then build a new tuple with tuple(ammo). The weapon only works again once ammo is a valid tuple.',
  guided:(e,b)=>[['CONVERT TO LIST','ammo = list(ammo)'],['ADD AMMO','ammo[0] = '+b.cap],['CONVERT TO TUPLE','ammo = tuple(ammo)']]},
 smg:{kind:'list',v:'ammo',make:(m,r)=>Ls([m,r]),lesson:'list',intro:'Its ammo is a list: ammo = [magazine, reserve]. Lists are mutable, so you can change items in place.',
  why:'A list can be changed after it is created: ammo[0] = 30 replaces the first item. Keep it a list - converting it to a tuple would make it immutable and the weapon would reject it.',guided:(e,b)=>[['ADD AMMO',load('ammo[0]','ammo[1]',b)]]},
 shotgun:{kind:'set',v:'shells',make:(m,r)=>St(Array.from({length:m},(_,i)=>i+1)),lesson:'set',intro:'Its shells are a set of unique ids: shells = {1, 2, ...}. A set keeps each value once.',
  why:'A set cannot hold duplicates: shells.add(3) twice still leaves one 3. Load shells by adding different ids with add(); the number of shells is len(shells).',guided:e=>[['ADD SHELL','shells.add('+(()=>{let n=1;while(e.shells.v.has(n))n++;return n})()+')']]},
 rifle:{kind:'dict',v:'ammo',make:(m,r)=>({t:'dict',v:new Map([['mag',m],['reserve',r]])}),lesson:'dict',intro:'Its ammo is a dict: ammo = {"mag": ..., "reserve": ...}. You read and write values by key.',
  why:'A dict stores key: value pairs. Write with ammo["mag"] = 24. Using a missing key raises KeyError, and ammo.mag is an AttributeError because dict values are reached with [ ].',guided:(e,b)=>[['ADD AMMO',load('ammo["mag"]','ammo["reserve"]',b)]]},
 sniper:{kind:'range',v:'ammo',immutable:1,make:(m,r)=>Rg(0,m),lesson:'loop',intro:'Its magazine is a range: ammo = range(0, n). len(ammo) is the rounds loaded. A range is immutable.',
  why:'A range is a fixed sequence of numbers, so ammo[0] = 1 raises TypeError. Build a new one instead: ammo = range(5) holds 5 rounds.',guided:(e,b)=>[['EDIT ITEM','ammo[0] = 1'],['BUILD NEW RANGE','ammo = range('+b.cap+')']]}};
function readPair(v,kind,nm){if(!v||tname(v)!==kind)bad(nm+' must be a '+kind+(kind==='tuple'?' again - convert it back with tuple().':'.'));
 if(kind==='dict'&&v.v.size!==2)bad('the dict must have only the keys "mag" and "reserve".');
 const a=kind==='dict'?[v.v.get('mag'),v.v.get('reserve')]:v.v;if(a.length!==2||!a.every(x=>Number.isInteger(x)&&x>=0))bad(nm+' must hold exactly two whole numbers: (magazine, reserve).');return{mag:a[0],reserve:a[1]}}
const PR={w:null,env:null,base:null,err:'',ok:'',reason:'',
 open(reason){if(state!=='play'||!G)return;const p=G.p,id=p.gun,R=RULES[id];K={};M.down=false;this.w=id;this.base={reserve:p.reserve,total:p.mag+p.reserve,cap:WEAPONS[id].mag,bonus:id==='pistol'?WEAPONS[id].mag:24};
  this.env={[R.v]:R.make(p.mag,p.reserve)};this.err='';this.ok='';this.reason=reason;state='pyr';
  if(reason==='violation'&&R.immutable)this.exec(R.kind==='tuple'?'ammo[0] = '+this.base.cap:'ammo[0] = 1');   // the attempt that breaks the rule
  $('pyIn').value='';$('pyWhy').style.display='none';show('pyr');this.render()},
 exec(code){try{Py.run(code,this.env);this.err='';this.ok='ran: '+code.split('\n').pop();if(this.reason==='violation')this.reason='fixing';return true}
  catch(e){if(!e.py)throw e;this.err=e.message;this.ok='';this.reason='violation';sfx('no');return false}},
 check(){const R=RULES[this.w],b=this.base,v=this.env[R.v];try{let r;
  if(R.kind==='set'){if(!v||tname(v)!=='set'||![...v.v].every(x=>Number.isInteger(x)&&x>0))bad('shells must be a set of whole numbers (unique shell ids).');r={mag:v.v.size,reserve:Math.max(0,b.reserve-v.v.size)}}
  else if(R.kind==='range'){if(!v||tname(v)!=='range')bad('ammo must be a range - build one with range(n).');r={mag:Math.max(0,v.b-v.a),reserve:Math.max(0,b.reserve-Math.max(0,v.b-v.a))}}
  else r=readPair(v,R.kind,R.v);
  if(r.mag>b.cap)bad('the magazine holds at most '+b.cap+' rounds.');if(r.mag+r.reserve>b.total+b.bonus)bad('you can add at most '+b.bonus+' bonus rounds.');return r}
  catch(e){if(!e.py)throw e;return{err:e.message}}},
 hint(){const R=RULES[this.w],v=this.env[R.v],c=this.check(),cap=this.base.cap;
  if(R.kind==='tuple'){if(v&&tname(v)==='tuple')return c.mag>0?'Valid tuple with ammo - press RESUME.':'Tuples cannot be edited. Make a list copy: ammo = list(ammo)';
   return c.err&&/tuple/.test(c.err)?'Now convert it back: ammo = tuple(ammo)':'Add ammo to the list: ammo[0] = '+cap}
  if(R.kind==='range')return c.mag>0?'Valid range - press RESUME.':'A range cannot be edited. Build a new one: ammo = range('+cap+')';
  return c.err?c.err:c.mag>0?'Looks valid - press RESUME.':R.kind==='set'?'Add some unique shell ids with shells.add(n).':'Set the magazine: '+(R.kind==='dict'?'ammo["mag"] = ':'ammo[0] = ')+cap},
 render(){const R=RULES[this.w],v=this.env[R.v],c=this.check(),viol=this.reason==='violation';
  $('pyT').textContent=viol?'PYTHON RULE VIOLATION':'MAGAZINE EMPTY - PYTHON RELOAD';$('pyT').style.color=viol?'#ff6b7a':'#fff';
  const lp=!SAVE.done.includes(R.lesson)?'  Lesson "'+R.lesson+'" in TRAINING MODE explains this.':'';$('pyRule').textContent='Your '+WEAPONS[this.w].name+' weapon. '+R.intro+lp;
  $('pyState').textContent=R.v+' = '+fmt(v)+'   # '+tname(v)+'\n'+(c.err?'not valid yet: '+c.err:'valid: magazine '+c.mag+'/'+this.base.cap+', reserve '+c.reserve);
  $('pyErr').textContent=this.err||this.ok||(this.w==='pistol'?'Tip: press the buttons in order - CONVERT TO LIST, ADD AMMO, CONVERT TO TUPLE - then RESUME.':'Tip: press ADD AMMO, then RESUME.');$('pyErr').style.color=this.err?'#ff6b7a':'#39ff7a';
  $('pyGuided').innerHTML=R.guided(this.env,this.base).map(g=>'<button data-c="'+encodeURIComponent(g[1])+'">'+g[0]+'</button>').join(' ');
  $('pyGo').disabled=!!c.err||c.mag<=0},
 commit(){const r=this.check();if(r.err||r.mag<=0)return;const p=G.p;p.mag=r.mag;p.reserve=r.reserve;p.rel=0;p.cd=.3;state='play';show(null);K={};M.down=false;sfx('ok');msg('PYTHON RELOAD: '+r.mag+'/'+this.base.cap)},
 reset(){this.env=null;this.err=this.ok=''}};
$('pyRun').onclick=()=>{const ta=$('pyIn');PR.exec(ta.value);ta.value='';PR.render()};
$('pyGuided').addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(b&&b.dataset.c){PR.exec(decodeURIComponent(b.dataset.c));PR.render();b.blur()}});
$('pyHint').onclick=()=>{PR.err='';PR.ok='HINT: '+PR.hint();PR.render()};
$('pyWhyBtn').onclick=()=>{const w=$('pyWhy');w.textContent=RULES[PR.w].why;w.style.display=w.style.display==='none'?'':'none'};
$('pyGo').onclick=()=>PR.commit();$('pyMenu').onclick=()=>leaveToMenu($('pyMenu'));
