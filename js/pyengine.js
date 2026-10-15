"use strict";
/* pyengine.js - a small Python-subset engine for Practice Mode. It lexes, parses and runs functions (def/if/elif/else/for/while,
   lists, dicts, tuples, strings, comprehensions, common builtins) with a step limit. It is self-contained so it can run inside a
   Web Worker that is terminated after a time limit, which keeps bad or endless player code away from the game. It is NOT full Python:
   classes, try/except, imports and similar are reported as "not supported yet" instead of being guessed. */
function PyEngine(){
 const KW=new Set('def return if elif else for while in not and or is pass break continue True False None lambda class try except finally with import from raise global nonlocal del assert yield async await'.split(' '));
 const UNSUP=new Set('class try except finally with import from raise global nonlocal del assert yield async await lambda'.split(' '));
 class PyErr extends Error{constructor(kind,msg,line){super(msg);this.kind=kind;this.line=line}}
 const err=(k,m,l)=>{throw new PyErr(k,m,l)};
 /* ---------- lexer (indent/dedent like Python) ---------- */
 function lex(src){const toks=[],ind=[0];let depth=0,line=1,i=0,start=true;const n=src.length,push=(t,v,f)=>toks.push({t,v,l:line,f});
  while(i<n){
   if(start&&depth===0){let w=0;while(i<n&&(src[i]===' '||src[i]==='\t')){w+=src[i]==='\t'?4:1;i++}
    if(i>=n)break;if(src[i]==='\r'){i++;continue}if(src[i]==='\n'){i++;line++;continue}if(src[i]==='#'){while(i<n&&src[i]!=='\n')i++;continue}
    if(w>ind[ind.length-1]){ind.push(w);push('INDENT')}else{while(w<ind[ind.length-1]){ind.pop();push('DEDENT')}if(w!==ind[ind.length-1])err('indent','unindent does not match any outer indentation level',line)}
    start=false}
   const c=src[i];
   if(c===' '||c==='\t'||c==='\r'){i++;continue}
   if(c==='#'){while(i<n&&src[i]!=='\n')i++;continue}
   if(c==='\n'){i++;if(depth===0){push('NEWLINE');start=true}line++;continue}
   if(c==='\\'&&src[i+1]==='\n'){i+=2;line++;continue}
   if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]||''))){let j=i;while(j<n&&/[0-9_]/.test(src[j]))j++;if(src[j]==='.'){j++;while(j<n&&/[0-9]/.test(src[j]))j++}if(/[eE]/.test(src[j]||'')&&/[0-9+-]/.test(src[j+1]||'')){j+=2;while(j<n&&/[0-9]/.test(src[j]))j++}const txt=src.slice(i,j);push('NUM',parseFloat(txt.replace(/_/g,'')),/[.eE]/.test(txt));i=j;continue}
   if(/[A-Za-z_]/.test(c)){let j=i;while(j<n&&/\w/.test(src[j]))j++;const w=src.slice(i,j);push(KW.has(w)?'KW':'NAME',w);i=j;continue}
   if(c==='"'||c==="'"){const q=src.startsWith(c.repeat(3),i)?c.repeat(3):c;let j=i+q.length,s='';while(j<n&&!src.startsWith(q,j)){if(src[j]==='\\'){const e=src[j+1];s+=e==='n'?'\n':e==='t'?'\t':e;j+=2;continue}if(src[j]==='\n'){if(q.length===1)err('syntax','unterminated string literal',line);line++}s+=src[j++]}
    if(j>=n)err('syntax','unterminated string literal',line);push('STR',s);i=j+q.length;continue}
   const three=src.slice(i,i+3),two=src.slice(i,i+2);
   if(three==='**='||three==='//='){push('OP',three);i+=3;continue}
   if(['==','!=','<=','>=','//','**','+=','-=','*=','/=','%=','->'].includes(two)){push('OP',two);i+=2;continue}
   if('+-*/%<>=()[]{},:.'.includes(c)){if('([{'.includes(c))depth++;if(')]}'.includes(c))depth--;push('OP',c);i++;continue}
   err('syntax','invalid character '+JSON.stringify(c),line)}
  if(toks.length&&toks[toks.length-1].t!=='NEWLINE')push('NEWLINE');while(ind.length>1){ind.pop();push('DEDENT')}push('EOF');return toks}
 /* ---------- parser ---------- */
 function parse(src){const T=lex(src);let p=0;
  const is=(t,v)=>T[p].t===t&&(v===undefined||T[p].v===v),isOp=v=>T[p].t==='OP'&&T[p].v===v,isKw=v=>T[p].t==='KW'&&T[p].v===v,
   eat=(t,v)=>{if(!is(t,v))err('syntax','invalid syntax: expected '+(v||t)+(T[p].t==='EOF'?'':' near "'+(T[p].v===undefined?T[p].t:T[p].v)+'"'),T[p].l);return T[p++]},opt=(t,v)=>is(t,v)?T[p++]:null;
  const body=()=>{const L=[];while(!is('EOF')&&!is('DEDENT'))L.push(stmt());return L};
  const block=()=>{eat('OP',':');if(opt('NEWLINE')){if(!is('INDENT'))err('indent','expected an indented block',T[p].l);p++;const b=body();eat('DEDENT');return b}return[simple()]};
  function stmt(){const t=T[p];if(t.t==='KW'){if(t.v==='def')return fdef();if(t.v==='if')return ifs();if(t.v==='for')return fors();if(t.v==='while')return whiles();if(UNSUP.has(t.v))err('unsupported','"'+t.v+'" is not supported by the practice engine yet',t.l)}
   if(t.t==='INDENT')err('indent','unexpected indent',t.l);return simple()}
  function simple(){const t=T[p],l=t.l;let s;
   if(t.t==='KW'&&t.v==='return'){p++;s={k:'ret',e:is('NEWLINE')?null:exprList(),l}}
   else if(t.t==='KW'&&(t.v==='pass'||t.v==='break'||t.v==='continue')){p++;s={k:t.v,l}}
   else{const e=exprList();if(isOp('=')){p++;s={k:'asg',t:e,e:exprList(),l}}else if(T[p].t==='OP'&&['+=','-=','*=','/=','//=','%=','**='].includes(T[p].v)){const op=T[p++].v.slice(0,-1);s={k:'aug',t:e,op,e:exprList(),l}}else s={k:'expr',e,l}}
   if(!is('EOF')&&!is('DEDENT'))eat('NEWLINE');return s}
  function fdef(){const l=T[p++].l,n=eat('NAME').v;eat('OP','(');const ps=[];while(!isOp(')')){const nm=eat('NAME').v;let d=null;if(opt('OP','='))d=expr();ps.push({n:nm,d});if(!opt('OP',','))break}eat('OP',')');if(opt('OP','->'))expr();return{k:'def',n,ps,b:block(),l}}
  function ifs(){const l=T[p++].l,c=expr(),b=block();let o=[];if(isKw('elif'))o=[ifs()];else if(isKw('else')){p++;o=block()}return{k:'if',c,b,o,l}}
  function target(){const a=[eat('NAME').v];while(opt('OP',','))a.push(eat('NAME').v);return a}
  function fors(){const l=T[p++].l,t=target();eat('KW','in');const it=exprList();return{k:'for',t,it,b:block(),l}}
  function whiles(){const l=T[p++].l,c=expr();return{k:'while',c,b:block(),l}}
  function exprList(){const e=expr();if(isOp(',')){const a=[e];while(opt('OP',',')){if(is('NEWLINE')||isOp('=')||isOp(')'))break;a.push(expr())}return{k:'tup',a,l:e.l}}return e}
  function expr(){const e=orx();if(isKw('if')){p++;const c=orx();eat('KW','else');return{k:'tern',c,a:e,b:expr(),l:e.l}}return e}
  function orx(){let e=andx();while(isKw('or')){p++;e={k:'or',a:e,b:andx(),l:e.l}}return e}
  function andx(){let e=notx();while(isKw('and')){p++;e={k:'and',a:e,b:notx(),l:e.l}}return e}
  function notx(){if(isKw('not')){const l=T[p++].l;return{k:'not',e:notx(),l}}return cmp()}
  function cmp(){let e=arith();const ops=[],rest=[];for(;;){let op=null;if(T[p].t==='OP'&&['==','!=','<','>','<=','>='].includes(T[p].v))op=T[p++].v;else if(isKw('in')){p++;op='in'}else if(isKw('not')&&T[p+1].t==='KW'&&T[p+1].v==='in'){p+=2;op='not in'}else if(isKw('is')){p++;op=opt('KW','not')?'is not':'is'}else break;ops.push(op);rest.push(arith())}
   return ops.length?{k:'cmp',e,ops,rest,l:e.l}:e}
  function arith(){let e=term();while(isOp('+')||isOp('-')){const op=T[p++].v;e={k:'bin',op,a:e,b:term(),l:e.l}}return e}
  function term(){let e=factor();while(isOp('*')||isOp('/')||isOp('//')||isOp('%')){const op=T[p++].v;e={k:'bin',op,a:e,b:factor(),l:e.l}}return e}
  function factor(){if(isOp('-')||isOp('+')){const op=T[p++].v,l=T[p-1].l;return{k:'neg',op,e:factor(),l}}return power()}
  function power(){let e=postfix();if(isOp('**')){p++;e={k:'bin',op:'**',a:e,b:factor(),l:e.l}}return e}
  function args(){const a=[];while(!isOp(')')){a.push(expr());if(!opt('OP',','))break}eat('OP',')');return a}
  function postfix(){let e=atom();for(;;){if(isOp('(')){const l=T[p++].l;e={k:'call',f:e,a:args(),l}}else if(isOp('[')){const l=T[p++].l;let lo=null,hi=null,sl=false;if(!isOp(':'))lo=expr();if(opt('OP',':')){sl=true;if(!isOp(']'))hi=expr()}eat('OP',']');e=sl?{k:'slice',o:e,lo,hi,l}:{k:'idx',o:e,i:lo,l}}
   else if(isOp('.')){const l=T[p++].l;e={k:'attr',o:e,n:eat('NAME').v,l}}else break}return e}
  function atom(){const t=T[p++];if(!t||t.t==='EOF'||t.t==='NEWLINE'||t.t==='INDENT'||t.t==='DEDENT')err('syntax','invalid syntax: unexpected end of the line',t?t.l:0);const l=t.l;
   if(t.t==='NUM')return{k:'num',v:t.v,f:t.f,l};if(t.t==='STR')return{k:'str',v:t.v,l};if(t.t==='NAME')return{k:'name',n:t.v,l};
   if(t.t==='KW'){if(t.v==='True')return{k:'lit',v:true,l};if(t.v==='False')return{k:'lit',v:false,l};if(t.v==='None')return{k:'lit',v:null,l};err('syntax','invalid syntax near "'+t.v+'"',l)}
   if(t.v==='('){if(opt('OP',')'))return{k:'tup',a:[],l};const e=exprList();eat('OP',')');return e}
   if(t.v==='['){if(opt('OP',']'))return{k:'list',a:[],l};const f=expr();if(isKw('for')){p++;const v=target();eat('KW','in');const it=orx();let c=null;if(isKw('if')){p++;c=orx()}eat('OP',']');return{k:'lc',e:f,v,it,c,l}}const a=[f];while(opt('OP',',')){if(isOp(']'))break;a.push(expr())}eat('OP',']');return{k:'list',a,l}}
   if(t.v==='{'){const kv=[];while(!isOp('}')){const k=expr();eat('OP',':');kv.push([k,expr()]);if(!opt('OP',','))break}eat('OP','}');return{k:'dict',kv,l}}
   err('syntax','invalid syntax near "'+t.v+'"',l)}
  const m=body();if(!is('EOF'))err('syntax','invalid syntax',T[p].l);return m}
 /* ---------- values and runtime ---------- */
 let steps=0,depth=0;const LIMIT=400000;
 const isNum=v=>typeof v==='number'||typeof v==='boolean',tn=v=>v===null?'NoneType':typeof v==='boolean'?'bool':typeof v==='number'?(Number.isInteger(v)?'int':'float'):typeof v==='string'?'str':Array.isArray(v)?(v._t?'tuple':'list'):v instanceof Map?'dict':'function';
 const truthy=v=>v===null?false:typeof v==='boolean'?v:typeof v==='number'?v!==0:typeof v==='string'?v.length>0:Array.isArray(v)?v.length>0:v instanceof Map?v.size>0:true;
 const eq=(a,b)=>{if(isNum(a)&&isNum(b))return Number(a)===Number(b);if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((x,i)=>eq(x,b[i]));if(a instanceof Map&&b instanceof Map)return a.size===b.size&&[...a].every(([k,v])=>b.has(k)&&eq(v,b.get(k)));return a===b};
 const rep=v=>v===null?'None':typeof v==='boolean'?(v?'True':'False'):typeof v==='string'?"'"+v+"'":Array.isArray(v)?(v._t?'('+v.map(rep).join(', ')+(v.length===1?',':'')+')':'['+v.map(rep).join(', ')+']'):v instanceof Map?'{'+[...v].map(([k,x])=>rep(k)+': '+rep(x)).join(', ')+'}':String(v);
 const str=v=>typeof v==='string'?v:rep(v);
 class Ret{constructor(v){this.v=v}}class Brk{}class Cnt{}
 const fmtNum=(v)=>v;
 function arith(op,a,b,l){const x=a,y=b;
  if(op==='+'){if(isNum(x)&&isNum(y))return Number(x)+Number(y);if(typeof x==='string'&&typeof y==='string')return x+y;if(Array.isArray(x)&&Array.isArray(y)){const r=x.concat(y);if(x._t&&y._t)r._t=true;return r}}
  else if(isNum(x)&&isNum(y)){const p=Number(x),q=Number(y);
   if(op==='-')return p-q;if(op==='*')return p*q;
   if(op==='/'){if(q===0)err('runtime','ZeroDivisionError: division by zero',l);return p/q}
   if(op==='//'){if(q===0)err('runtime','ZeroDivisionError: integer division or modulo by zero',l);return Math.floor(p/q)}
   if(op==='%'){if(q===0)err('runtime','ZeroDivisionError: integer division or modulo by zero',l);return p-q*Math.floor(p/q)}
   if(op==='**')return Math.pow(p,q)}
  else if(op==='*'){if(typeof x==='string'&&isNum(y))return y>0?x.repeat(y):'';if(Array.isArray(x)&&isNum(y)){let r=[];for(let i=0;i<y;i++)r=r.concat(x);return r}}
  err('runtime',"TypeError: unsupported operand type(s) for "+op+": '"+tn(x)+"' and '"+tn(y)+"'",l)}
 function compare(op,a,b,l){if(op==='==')return eq(a,b);if(op==='!=')return!eq(a,b);if(op==='is')return a===b||(isNum(a)&&isNum(b)&&a===b);if(op==='is not')return!(a===b);
  if(op==='in'||op==='not in'){let r;if(Array.isArray(b))r=b.some(x=>eq(x,a));else if(typeof b==='string'&&typeof a==='string')r=b.includes(a);else if(b instanceof Map)r=b.has(a);else err('runtime',"TypeError: argument of type '"+tn(b)+"' is not iterable",l);return op==='in'?r:!r}
  if((isNum(a)&&isNum(b))||(typeof a==='string'&&typeof b==='string')){const x=isNum(a)?Number(a):a,y=isNum(b)?Number(b):b;return op==='<'?x<y:op==='>'?x>y:op==='<='?x<=y:x>=y}
  err('runtime',"TypeError: '"+op+"' not supported between instances of '"+tn(a)+"' and '"+tn(b)+"'",l)}
 const iter=(v,l)=>{if(Array.isArray(v))return v.slice();if(typeof v==='string')return[...v];if(v instanceof Map)return[...v.keys()];err('runtime',"TypeError: '"+tn(v)+"' object is not iterable",l)};
 const idx=(o,i,l)=>{if(Array.isArray(o)||typeof o==='string'){if(!Number.isInteger(i))err('runtime','TypeError: indices must be integers',l);const k=i<0?o.length+i:i;if(k<0||k>=o.length)err('runtime','IndexError: '+tn(o)+' index out of range',l);return o[k]}
  if(o instanceof Map){if(!o.has(i))err('runtime','KeyError: '+rep(i),l);return o.get(i)}err('runtime',"TypeError: '"+tn(o)+"' object is not subscriptable",l)};
 const need=(a,n,name,l)=>{if(a.length<n)err('runtime','TypeError: '+name+'() missing a required argument',l)};
 const BUILTINS={
  len:(a,l)=>{need(a,1,'len',l);const v=a[0];if(Array.isArray(v)||typeof v==='string')return v.length;if(v instanceof Map)return v.size;err('runtime',"TypeError: object of type '"+tn(v)+"' has no len()",l)},
  abs:a=>Math.abs(a[0]),min:(a,l)=>{const v=a.length===1?iter(a[0],l):a;if(!v.length)err('runtime','ValueError: min() arg is an empty sequence',l);return v.reduce((m,x)=>compare('<',x,m,l)?x:m)},
  max:(a,l)=>{const v=a.length===1?iter(a[0],l):a;if(!v.length)err('runtime','ValueError: max() arg is an empty sequence',l);return v.reduce((m,x)=>compare('>',x,m,l)?x:m)},
  sum:(a,l)=>iter(a[0],l).reduce((s,x)=>arith('+',s,x,l),a.length>1?a[1]:0),
  range:(a,l)=>{const lo=a.length>1?a[0]:0,hi=a.length>1?a[1]:a[0],st=a.length>2?a[2]:1;if(st===0)err('runtime','ValueError: range() arg 3 must not be zero',l);const r=[];for(let i=lo;st>0?i<hi:i>hi;i+=st){r.push(i);if(r.length>1e6)err('runtime','MemoryError: range too large',l)}return r},
  int:(a,l)=>{const v=a[0];if(typeof v==='string'){if(!/^\s*[-+]?\d+\s*$/.test(v))err('runtime',"ValueError: invalid literal for int() with base 10: "+rep(v),l);return parseInt(v,10)}return Math.trunc(Number(v))},
  float:(a,l)=>{const v=a[0];if(typeof v==='string'&&isNaN(parseFloat(v)))err('runtime',"ValueError: could not convert string to float: "+rep(v),l);return Number(v)},
  str:a=>str(a[0]),bool:a=>truthy(a[0]),list:(a,l)=>a.length?iter(a[0],l):[],
  round:a=>{const v=a[0],d=a.length>1?a[1]:0,f=Math.pow(10,d),x=v*f,r=Math.round(x),e=Math.abs(x%1)===.5&&r%2!==0?r-1:r;return e/f},
  sorted:(a,l)=>{const v=iter(a[0],l);return v.sort((x,y)=>compare('<',x,y,l)?-1:compare('>',x,y,l)?1:0)},print:()=>null,
  enumerate:(a,l)=>iter(a[0],l).map((x,i)=>{const t=[i,x];t._t=true;return t}),dict:()=>new Map(),isinstance:()=>true};
 function method(o,n,a,l){const t=tn(o),bad=()=>err('runtime',"AttributeError: '"+t+"' object has no attribute '"+n+"'",l);
  if(t==='list'){switch(n){case'append':o.push(a[0]);return null;case'pop':if(!o.length)err('runtime','IndexError: pop from empty list',l);return a.length?o.splice(a[0]<0?o.length+a[0]:a[0],1)[0]:o.pop();case'extend':iter(a[0],l).forEach(x=>o.push(x));return null;
   case'insert':o.splice(a[0],0,a[1]);return null;case'remove':{const k=o.findIndex(x=>eq(x,a[0]));if(k<0)err('runtime','ValueError: list.remove(x): x not in list',l);o.splice(k,1);return null}case'index':{const k=o.findIndex(x=>eq(x,a[0]));if(k<0)err('runtime','ValueError: '+rep(a[0])+' is not in list',l);return k}
   case'count':return o.filter(x=>eq(x,a[0])).length;case'sort':o.sort((x,y)=>compare('<',x,y,l)?-1:compare('>',x,y,l)?1:0);if(a.length&&a[0])o.reverse();return null;case'reverse':o.reverse();return null;case'copy':return o.slice()}bad()}
  if(t==='tuple'){if(n==='count')return o.filter(x=>eq(x,a[0])).length;if(n==='index')return o.findIndex(x=>eq(x,a[0]));bad()}
  if(t==='dict'){switch(n){case'get':return o.has(a[0])?o.get(a[0]):(a.length>1?a[1]:null);case'keys':return[...o.keys()];case'values':return[...o.values()];case'items':return[...o].map(([k,v])=>{const x=[k,v];x._t=true;return x});
   case'pop':{if(o.has(a[0])){const v=o.get(a[0]);o.delete(a[0]);return v}if(a.length>1)return a[1];err('runtime','KeyError: '+rep(a[0]),l)}case'update':a[0].forEach((v,k)=>o.set(k,v));return null;case'setdefault':if(!o.has(a[0]))o.set(a[0],a.length>1?a[1]:null);return o.get(a[0])}bad()}
  if(t==='str'){switch(n){case'upper':return o.toUpperCase();case'lower':return o.toLowerCase();case'strip':return o.trim();case'split':return a.length&&a[0]!==null?o.split(a[0]):o.trim().split(/\s+/).filter(Boolean);case'join':return iter(a[0],l).map(x=>{if(typeof x!=='string')err('runtime','TypeError: sequence item: expected str instance, '+tn(x)+' found',l);return x}).join(o);
   case'startswith':return o.startsWith(a[0]);case'endswith':return o.endsWith(a[0]);case'replace':return o.split(a[0]).join(a[1]);case'count':return o.split(a[0]).length-1;case'title':return o.replace(/\b\w/g,c=>c.toUpperCase());case'isdigit':return/^\d+$/.test(o)}bad()}
  bad()}
 /* ---------- evaluator ---------- */
 function run(ast,G){const tick=l=>{if(++steps>LIMIT)err('runtime','TimeoutError: the code ran for too long (is there an endless loop?)',l)};
  function look(n,S,l){if(S&&S.has(n))return S.get(n);if(G.has(n))return G.get(n);if(n in BUILTINS)return{bi:n};err('runtime',"NameError: name '"+n+"' is not defined",l)}
  function ev(e,S){tick(e.l);switch(e.k){
   case'num':return e.v;case'str':return e.v;case'lit':return e.v;case'name':return look(e.n,S,e.l);
   case'tup':{const r=e.a.map(x=>ev(x,S));r._t=true;return r}case'list':return e.a.map(x=>ev(x,S));case'dict':{const m=new Map();e.kv.forEach(([k,v])=>m.set(ev(k,S),ev(v,S)));return m}
   case'lc':{const out=[],loc=new Map(S||[]);for(const x of iter(ev(e.it,S),e.l)){assignT(e.v,x,loc,e.l);if(!e.c||truthy(ev(e.c,loc)))out.push(ev(e.e,loc))}return out}
   case'neg':{const v=ev(e.e,S);if(!isNum(v))err('runtime',"TypeError: bad operand type for unary "+e.op+": '"+tn(v)+"'",e.l);return e.op==='-'?-Number(v):Number(v)}
   case'bin':return arith(e.op,ev(e.a,S),ev(e.b,S),e.l);
   case'cmp':{let a=ev(e.e,S);for(let i=0;i<e.ops.length;i++){const b=ev(e.rest[i],S);if(!compare(e.ops[i],a,b,e.l))return false;a=b}return true}
   case'and':{const a=ev(e.a,S);return truthy(a)?ev(e.b,S):a}case'or':{const a=ev(e.a,S);return truthy(a)?a:ev(e.b,S)}case'not':return!truthy(ev(e.e,S));
   case'tern':return truthy(ev(e.c,S))?ev(e.a,S):ev(e.b,S);
   case'idx':return idx(ev(e.o,S),ev(e.i,S),e.l);
   case'slice':{const o=ev(e.o,S),lo=e.lo?ev(e.lo,S):0,hi=e.hi?ev(e.hi,S):undefined;if(!Array.isArray(o)&&typeof o!=='string')err('runtime',"TypeError: '"+tn(o)+"' object is not subscriptable",e.l);return o.slice(lo,hi)}
   case'attr':{err('runtime',"AttributeError: attributes are only supported when called, like items.append(x)",e.l)}
   case'call':{if(e.f.k==='attr'){const o=ev(e.f.o,S);return method(o,e.f.n,e.a.map(x=>ev(x,S)),e.l)}const f=ev(e.f,S),a=e.a.map(x=>ev(x,S));if(f&&f.bi)return BUILTINS[f.bi](a,e.l);if(f&&f.ps)return call(f,a,e.l);err('runtime',"TypeError: '"+tn(f)+"' object is not callable",e.l)}}
   err('runtime','unsupported expression',e.l)}
  function assignT(t,v,S,l){if(Array.isArray(t)){if(t.length===1){S.set(t[0],v);return}const a=iter(v,l);if(a.length!==t.length)err('runtime','ValueError: cannot unpack '+a.length+' values into '+t.length+' names',l);t.forEach((n,i)=>S.set(n,a[i]))}else S.set(t,v)}
  function store(t,v,S,l){if(t.k==='name'){S.set(t.n,v);return}if(t.k==='tup'){const a=iter(v,l);if(a.length!==t.a.length)err('runtime','ValueError: cannot unpack '+a.length+' values into '+t.a.length+' names',l);t.a.forEach((x,i)=>store(x,a[i],S,l));return}
   if(t.k==='idx'){const o=ev(t.o,S),i=ev(t.i,S);if(Array.isArray(o)){if(o._t)err('runtime',"TypeError: 'tuple' object does not support item assignment",l);const k=i<0?o.length+i:i;if(!Number.isInteger(k)||k<0||k>=o.length)err('runtime','IndexError: list assignment index out of range',l);o[k]=v;return}if(o instanceof Map){o.set(i,v);return}err('runtime',"TypeError: '"+tn(o)+"' object does not support item assignment",l)}
   err('syntax','cannot assign to this expression',l)}
  function exec(b,S){for(const s of b){tick(s.l);switch(s.k){
   case'expr':ev(s.e,S);break;case'pass':break;case'break':throw new Brk();case'continue':throw new Cnt();case'ret':throw new Ret(s.e?ev(s.e,S):null);
   case'asg':store(s.t,ev(s.e,S),S||G,s.l);break;
   case'aug':{const cur=ev(s.t,S),r=ev(s.e,S);store(s.t,(Array.isArray(cur)&&!cur._t&&s.op==='+'&&Array.isArray(r))?(r.forEach(x=>cur.push(x)),cur):arith(s.op,cur,r,s.l),S||G,s.l);break}
   case'if':if(truthy(ev(s.c,S)))exec(s.b,S);else exec(s.o,S);break;
   case'while':while(truthy(ev(s.c,S))){try{exec(s.b,S)}catch(x){if(x instanceof Brk)break;if(x instanceof Cnt)continue;throw x}}break;
   case'for':for(const x of iter(ev(s.it,S),s.l)){assignT(s.t,x,S||G,s.l);try{exec(s.b,S)}catch(e){if(e instanceof Brk)break;if(e instanceof Cnt)continue;throw e}}break;
   case'def':{const f={ps:s.ps,b:s.b,n:s.n,defs:s.ps.map(p=>p.d?ev(p.d,S):undefined)};(S||G).set(s.n,f);break}}}}
  function call(f,a,l){if(++depth>150){depth=0;err('runtime','RecursionError: maximum recursion depth exceeded',l)}
   if(a.length>f.ps.length)err('runtime','TypeError: '+f.n+'() takes '+f.ps.length+' positional arguments but '+a.length+' were given',l);
   const L=new Map();f.ps.forEach((p,i)=>{if(i<a.length)L.set(p.n,a[i]);else if(f.defs[i]!==undefined)L.set(p.n,f.defs[i]);else err('runtime','TypeError: '+f.n+"() missing required argument: '"+p.n+"'",l)});
   try{exec(f.b,L)}catch(x){if(x instanceof Ret){depth--;return x.v}depth--;throw x}depth--;return null}
  exec(ast,null);return{call,G}}
 /* ---------- public: run a function against test cases ---------- */
 const fromJ=v=>Array.isArray(v)?v.map(fromJ):(v&&typeof v==='object')?new Map(Object.entries(v).map(([k,x])=>[k,fromJ(x)])):v;
 const toJ=v=>Array.isArray(v)?v.map(toJ):v instanceof Map?Object.fromEntries([...v].map(([k,x])=>[k,toJ(x)])):(v&&v.ps)?'<function>':v;
 const same=(a,b)=>{if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<1e-9;if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((x,i)=>same(x,b[i]));if(a&&b&&typeof a==='object'&&typeof b==='object'){const ka=Object.keys(a),kb=Object.keys(b);return ka.length===kb.length&&ka.every(k=>same(a[k],b[k]))}return a===b};
 const show=v=>JSON.stringify(v===undefined?null:v).replace(/null/g,'None').replace(/true/g,'True').replace(/false/g,'False');
 function runTests(code,spec){steps=0;depth=0;let G=new Map(),env;
  try{const ast=parse(code);env=run(ast,G)}catch(e){if(e instanceof PyErr)return{status:'fail',kind:e.kind==='indent'?'indent':e.kind==='unsupported'?'unsupported':e.kind==='runtime'?'runtime':'syntax',line:e.line,message:e.message};return{status:'fail',kind:'runtime',message:String(e&&e.message||e)}}
  const f=G.get(spec.fn);if(!f||!f.ps)return{status:'fail',kind:'logic',message:'I could not find a function named '+spec.fn+'. Define it with: def '+spec.fn+'('+spec.params.join(', ')+'):'};
  const all=spec.tests.map(t=>[t,true]).concat((spec.hidden||[]).map(t=>[t,false]));let passed=0,hiddenFail=0;
  for(const[t,pub]of all){steps=0;depth=0;const args=fromJ(t.args);let out;
   try{out=env.call(f,args,0)}catch(e){if(e instanceof PyErr)return{status:'fail',kind:'runtime',line:e.line,message:e.message+(pub?' (while running '+spec.fn+'('+t.args.map(show).join(', ')+'))':' (a hidden test with edge-case input)')};if(e instanceof Ret)out=e.v;else return{status:'fail',kind:'runtime',message:String(e&&e.message||e)}}
   const got=toJ(out),ok=same(got,t.expect)&&(!t.after||same(args.map(toJ),t.after));
   if(ok){passed++;continue}
   if(!pub){hiddenFail++;continue}
   if(got===null&&t.expect!==null)return{status:'fail',kind:'output',message:spec.fn+'('+t.args.map(show).join(', ')+') returned None, but it should return '+show(t.expect)+'. Use return (printing does not return a value).',passed,total:all.length};
   if(tn(out)!==tn(fromJ(t.expect))&&!(isNum(out)&&typeof t.expect==='number'))return{status:'fail',kind:'output',message:spec.fn+'('+t.args.map(show).join(', ')+') returned a '+tn(out)+' ('+show(got)+') but the task expects a '+tn(fromJ(t.expect))+' like '+show(t.expect)+'.',passed,total:all.length};
   if(t.after&&same(got,t.expect))return{status:'fail',kind:'logic',message:'The return value is right, but the data passed in should also be changed: expected it to become '+show(t.after)+' but it is '+show(args.map(toJ))+'.',passed,total:all.length};
   return{status:'fail',kind:'logic',message:spec.fn+'('+t.args.map(show).join(', ')+') returned '+show(got)+', but the task expects '+show(t.expect)+'.',passed,total:all.length}}
  if(hiddenFail)return{status:'fail',kind:'logic',message:'Your function passes the examples, but '+hiddenFail+' hidden test(s) failed. Check edge cases such as boundary values, zero, negative numbers and empty lists.',passed,total:all.length};
  return{status:'ok',passed,total:all.length,message:'All '+all.length+' tests passed.'}}
 return{runTests,parse,lex}}
