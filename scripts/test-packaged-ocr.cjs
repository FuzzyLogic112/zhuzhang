// Run the installed ASAR module with Electron's Node runtime to exercise worker
// paths and bundled model files, without opening or automating a browser window.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(process.env.ZHUZHANG_OCR_ASAR){
 (async()=>{
  const asar=process.env.ZHUZHANG_OCR_ASAR,recognize=require(asar+'/recognize.cjs').recognize;
  const text=await recognize(new Uint8Array(fs.readFileSync('test-fixtures/invoice-ocr.png')),path.join(path.dirname(asar),'ocr'));
  assert.match(text.replace(/\s/g,''),/20260927000000000123/);assert.match(text,/4520/);assert.match(text,/测试建材/);
  console.log('PASS packaged desktop ASAR, worker and offline models');
 })().catch(e=>{console.error(e);process.exitCode=1});
}else{
 function find(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.name==='app.asar')return p;if(entry.isDirectory()){const found=find(p);if(found)return found}}}
 const asar=find(path.resolve('desktop/release'));assert.ok(asar,'packaged app.asar missing');
 const electron=require('../desktop/node_modules/electron');
 const r=require('node:child_process').spawnSync(electron,[__filename],{stdio:'inherit',env:{...process.env,ELECTRON_RUN_AS_NODE:'1',ZHUZHANG_OCR_ASAR:asar},timeout:120000});
 if(r.error)throw r.error;process.exitCode=r.status??1;
}
