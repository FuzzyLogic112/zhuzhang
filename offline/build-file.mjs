import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('docs/index.html');
const script=fs.readFileSync('build/app.iife.js','utf8').replace(/<\/script/gi,'<\\/script');
const css=fs.readFileSync('build/app.css','utf8');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>筑账 · 免服务器离线版</title><style>${css}</style></head><body><div id="root"><p style="padding:32px;font-family:sans-serif">正在打开本地账本…请使用电脑 Edge 或 Chrome 普通窗口。</p></div><noscript>请启用 JavaScript 后打开此离线账本。</noscript><script>${script}</script></body></html>`;
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);fs.writeFileSync(path.join(path.dirname(out),'.nojekyll'),'');console.log(out+' ('+Buffer.byteLength(html)+' bytes)');
