import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),out='/tmp/living-document-qa';
await fs.mkdir(out,{recursive:true});
try{await fs.symlink(path.resolve('node_modules'),path.join(out,'node_modules'));}catch(e){if(e.code!=='EEXIST')throw e;}
for(const name of await fs.readdir('src/components')){
 if(!/\.(mjs|jsx)$/.test(name))continue;
 let content=await fs.readFile(path.join('src/components',name),'utf8');
 if(name.endsWith('.jsx'))content=ts.transpileModule(content,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 content=content.replace(/from ['"](\.\/[^'"]+)['"]/g,(_,p)=>`from '${p.endsWith('.mjs')?p:p+'.mjs'}'`);
 await fs.writeFile(path.join(out,name.replace(/\.jsx$/,'.mjs')),content);
}
const Presentation=(await import(pathToFileURL(path.join(out,'PresentationDocument.mjs')))).default;
const {chaptersFor,narrationFor}=await import(pathToFileURL(path.join(out,'narrative.mjs')));
const fixtures=JSON.parse(await fs.readFile('tests/fixtures.json','utf8'));
let checks=0;
for(const [name,data] of Object.entries(fixtures))for(const b of chaptersFor(data)){
 const controller={state:{time:b.complete,playing:false},reduced:true,dispatch:()=>{},speed:1,setSpeed:()=>{},setReduced:()=>{}};
 const html=renderToStaticMarkup(React.createElement(Presentation,{data,controller}));
 assert.ok(!/NaN|Infinity/.test(html),name+' '+b.id);if(b.id!=='result')assert.ok(html.includes('Routing Agent'));
 if(b.id==='result'){assert.ok(html.includes('benchmark-grid'));assert.ok(html.includes('Replay presentation'));assert.ok(html.includes(narrationFor({chapter:'result'},data).text));}
 checks++;
}
console.log(`${checks} real component scenario/state renders passed.`);
const loader=path.join(out,'jsx-loader.cjs');
await fs.writeFile(loader,`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;};`);
const webpack=require('next/dist/compiled/webpack/webpack').webpack;
await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:path.resolve('scripts/browser-qa.jsx'),output:{path:out,filename:'qa.js'},resolve:{extensions:['.tsx','.jsx','.mjs','.js']},module:{rules:[{test:/\.css$/,type:'asset/source'},{test:/\.[jt]sx$/,use:loader}]}},(error,stats)=>error?reject(error):stats.hasErrors()?reject(new Error(stats.toString({all:false,errors:true}))):resolve()));
const css=await fs.readFile('app/globals.css','utf8');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}.qa-toolbar{position:relative;z-index:40;display:flex;flex-wrap:wrap;gap:10px;background:#f8faf8;border-bottom:1px solid #e2e8e2;padding:7px;font:12px Arial}.qa-toolbar select{font:inherit}.qa-toolbar+main .app-header{top:60px}</style></head><body><div id="root"></div><script src="qa.js"></script></body></html>`);
console.log(`Test-only browser harness: ${out}`);
