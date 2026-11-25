import http from 'node:http';
import fs from 'node:fs/promises';
const root='/tmp/living-document-qa';
http.createServer(async(req,res)=>{
 if(req.url==='/api/simulate'){
  const upstream=http.request('http://127.0.0.1:8000/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'}},r=>{res.writeHead(r.statusCode,{'Content-Type':'application/json'});r.pipe(res)});
  upstream.on('error',()=>{res.writeHead(502);res.end('Backend unavailable')});req.pipe(upstream);return;
 }
 const file=req.url==='/'?'index.html':req.url.slice(1);
 if(!['index.html','qa.js'].includes(file)){res.writeHead(404);res.end();return;}
 try{res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':'text/html'});res.end(await fs.readFile(`${root}/${file}`))}catch{res.writeHead(404);res.end()}
}).listen(5182,'127.0.0.1',()=>console.log('QA http://127.0.0.1:5182'));
