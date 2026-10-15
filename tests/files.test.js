// Run with: node tests/files.test.js  (every file referenced by index.html must exist)
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(u=>!/^(https?:|mailto:)/.test(u));
const missing=refs.filter(f=>!fs.existsSync(path.join(root,f)));
console.log(missing.length?'MISSING: '+missing.join(', '):'All '+refs.length+' referenced files exist');process.exit(missing.length?1:0);
