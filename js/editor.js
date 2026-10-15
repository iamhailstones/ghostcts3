"use strict";
/* editor.js - helpers for the lesson code editor (#cin): Python-aware 4-space auto-indent, smart Tab/Backspace,
   caret always kept in view, and phone-keyboard layout. The editor is still a plain textarea, so typing, deleting and pasting work natively.
   PyIndent reads the code with a small tokenizer (strings, comments, brackets), not with line-by-line guesses. It never completes answers. */
const PyIndent={
 kw:c=>(c.match(/^(if|elif|else|for|while|def|class|try|except|finally|with|return|break|continue|pass|raise)\b/)||[])[1]||'',
 /* describe every physical line (indent, code without strings/comments, whether it continues a bracket/string) and the final state */
 scan(text){let d=0,q='',stack=[],logical=0;const lines=[];
  for(const raw of text.split('\n')){const cont=d>0||q!=='',indent=raw.match(/^[ \t]*/)[0].replace(/\t/g,'    ').length;if(!cont)logical=indent;
   let code='',i=0;
   while(i<raw.length){const c=raw[i];
    if(q){if(raw.startsWith(q,i)){i+=q.length;q='';code+='S'}else{if(c==='\\')i++;i++}continue}
    if(c==='#')break;
    if(c==='"'||c==="'"){const t=raw.startsWith(c.repeat(3),i)?c.repeat(3):c;q=t;i+=t.length;code+='S';continue}
    if('([{'.includes(c)){d++;stack.push(logical)}else if(')]}'.includes(c)&&d>0){d--;stack.pop()}
    code+=c;i++}
   if(q.length===1)q='';
   lines.push({indent,logical,code:code.trim(),cont})}
  return{lines,d,q,hang:stack.length?stack[stack.length-1]:0}},
 /* indentation for the line after the caret: +4 after a block header, hanging indent inside brackets, back one level after return/break/pass,
    and back one level when Enter is pressed on an empty indented line (that ends the block) */
 next(before){const s=this.scan(before),cur=s.lines[s.lines.length-1];
  if(s.q)return cur.indent;if(s.d>0)return s.hang+4;
  if(/:$/.test(cur.code)&&!/^lambda\b/.test(cur.code))return cur.logical+4;
  if(cur.code===''&&cur.indent>0&&!cur.cont)return Math.max(0,cur.indent-4);
  if(/^(return|break|continue|pass|raise)$/.test(this.kw(cur.code)))return Math.max(0,cur.logical-4);
  return cur.logical},
 /* where should an else/elif/except/finally on the last line sit? -1 = not applicable / unknown */
 align(before){const L=this.scan(before).lines,cur=L[L.length-1],k=this.kw(cur.code);if(cur.cont||!/^(elif|else|except|finally)$/.test(k))return-1;
  const want={elif:['if','elif'],else:['if','elif','for','while','try','except'],except:['try','except'],finally:['try','except','else']}[k];let limit=cur.indent;
  for(let i=L.length-2;i>=0&&limit>=0;i--){const p=L[i];if(p.cont||!p.code||p.indent>limit)continue;if(want.includes(this.kw(p.code)))return p.indent;limit=p.indent-1}return-1}};
const Editor={busy:false,
 edit(ta,a,b,text){this.busy=true;ta.setSelectionRange(a,b);if(!document.execCommand||!document.execCommand('insertText',false,text))ta.setRangeText(text,a,b,'end');this.busy=false},   // execCommand keeps Undo working
 /* scroll only when the caret line is outside the visible part, so moving around never makes the editor jump */
 reveal(ta){const lh=parseFloat(getComputedStyle(ta).lineHeight)||22,ln=ta.value.slice(0,ta.selectionStart).split('\n').length,top=(ln-1)*lh;
  if(top<ta.scrollTop)ta.scrollTop=top;else if(top+2*lh>ta.scrollTop+ta.clientHeight)ta.scrollTop=top+2*lh-ta.clientHeight},
 enter(ta){let a=ta.selectionStart,b=ta.selectionEnd;const v=ta.value,ls=v.lastIndexOf('\n',a-1)+1,cur=v.slice(ls).match(/^ */)[0].length,al=PyIndent.align(v.slice(0,a));
  if(al>=0&&al!==cur&&cur<=a-ls){this.edit(ta,ls,ls+cur,' '.repeat(al));a+=al-cur;b+=al-cur}   // first put else/elif/except/finally where it belongs
  const ind=PyIndent.next(ta.value.slice(0,a)),ls2=ta.value.lastIndexOf('\n',a-1)+1,pre=ta.value.slice(ls2,a);
  if(a===b&&pre.length&&/^ +$/.test(pre)&&ind<pre.length&&!ta.value.slice(a).split('\n')[0].trim()){this.edit(ta,ls2,a,'');a=b=ls2}   // an empty indented line ends the block: drop its spaces
  this.edit(ta,a,b,'\n'+' '.repeat(ind));this.reveal(ta)},
 tab(ta,shift){const v=ta.value,a=ta.selectionStart,b=ta.selectionEnd,ls=v.lastIndexOf('\n',a-1)+1,multi=v.slice(a,b).includes('\n');
  if(!shift&&!multi){this.edit(ta,a,b,' '.repeat(4-((a-ls)%4)));return}
  const le=b,block=v.slice(ls,le),out=block.split('\n').map(l=>shift?l.replace(/^ {1,4}/,''):'    '+l).join('\n');this.edit(ta,ls,le,out);ta.setSelectionRange(ls,ls+out.length)},
 init(){const ta=$('cin');if(!ta||!ta.addEventListener)return;
  ta.addEventListener('beforeinput',e=>{if(this.busy)return;const a=ta.selectionStart,b=ta.selectionEnd;
   if(e.inputType==='insertLineBreak'||e.inputType==='insertParagraph'){e.preventDefault();this.enter(ta)}
   else if(e.inputType==='deleteContentBackward'&&a===b){const ls=ta.value.lastIndexOf('\n',a-1)+1,pre=ta.value.slice(ls,a);if(pre.length&&/^ +$/.test(pre)){e.preventDefault();this.edit(ta,a-((pre.length%4)||4),a,'');this.reveal(ta)}}});
  ta.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();this.tab(ta,e.shiftKey);this.reveal(ta)}});
  ta.addEventListener('input',()=>{if(this.busy)return;const v=ta.value,a=ta.selectionStart;if(a!==ta.selectionEnd)return;
   const ls=v.lastIndexOf('\n',a-1)+1,line=v.slice(ls,a);
   if(/^\s*(else|elif\b.*|except\b.*|finally)\s*:$/.test(line)&&!v.slice(a).split('\n')[0].trim()){const al=PyIndent.align(v.slice(0,a)),cur=line.match(/^ */)[0].length;
    if(al>=0&&al!==cur){this.edit(ta,ls,ls+cur,' '.repeat(al));ta.setSelectionRange(a+al-cur,a+al-cur)}}   // suggested alignment as soon as the colon is typed
   this.reveal(ta)});
  ['keyup','click','focus'].forEach(ev=>ta.addEventListener(ev,()=>this.reveal(ta)));
  /* phone keyboard: pin the lesson screen to the visible area so the editor is never pushed under the keyboard */
  const vv=window.visualViewport,f=()=>{const el=document.activeElement,open=!!el&&(el.id==='cin'||el.id==='pyIn')&&matchMedia('(pointer:coarse)').matches;
   document.body.classList.toggle('kb',open);if(vv){const s=document.documentElement.style;s.setProperty('--vvh',vv.height+'px');s.setProperty('--vvt',vv.offsetTop+'px')}if(open&&el.id==='cin')this.reveal(el)};
  if(vv){vv.addEventListener('resize',f);vv.addEventListener('scroll',f)}addEventListener('focusin',f);addEventListener('focusout',()=>setTimeout(f,60))}};
if(typeof document!=='undefined'&&typeof $==='function')Editor.init();
