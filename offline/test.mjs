import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import fs from 'node:fs';
import {calculateEstimate,csv,saveBlob,saveNative,localApi,getData,snapshot,getFile,exportBackup,prepareRestore,restoreBackup,readBackupZip,exportProject,calendarText,validateBackup,defaultEstimate,today} from '../test-build/api.js';
globalThis.indexedDB=indexedDB;globalThis.window=new EventTarget();
const downloads=[];globalThis.document={createElement(){return{click(){downloads.at(-1).name=this.download}}}};URL.createObjectURL=blob=>{downloads.push({blob});return'blob:test-download'};URL.revokeObjectURL=()=>{};
const later=globalThis.setTimeout;globalThis.setTimeout=(...args)=>{const t=later(...args);t.unref();return t};
let passed=0;async function check(name,fn){await fn();passed++;console.log('PASS '+name)}
const project={name:'离线测试道路',code:'QA-LOCAL',client:'测试甲方',manager:'测试负责人',phone:'',location:'',category:'道路工程',status:'施工中',contract:1000000,invoiceTarget:800000,invoiceDue:today(),completedAt:'',note:''};
let p,r,doc,restored,originalBackup;
await check('empty database and local identity',async()=>{const d=await getData();assert.equal(d.projects.length,0);assert.equal(d.authenticated,true);assert.equal(d.services.scheduled,false)});
await check('project persists across reads',async()=>{p=await localApi('projects',project);assert.equal((await getData()).projects[0].id,p.id)});
await check('invalid date leaves database unchanged',async()=>{await assert.rejects(localApi('projects',{...project,invoiceDue:'2026-02-30'}));assert.equal((await getData()).projects.length,1)});
await check('invoice number duplicate rejected',async()=>{const i={projectId:p.id,number:'12345678901234567890',code:'',seller:'供应商',buyer:'',amount:600000,tax:20000,date:today(),category:'材料费',status:'已核对',fileId:''};await localApi('invoices',i);await assert.rejects(localApi('invoices',i),/重复/)});
await check('receipt retry idempotency',async()=>{r=await localApi('receivables',{projectId:p.id,type:'质保金',amount:100000,due:'2030-09-27',reminderDays:30,contact:'',note:''});const body={requestId:crypto.randomUUID(),projectId:p.id,receivableId:r.id,date:today(),method:'收款',content:'测试收款',nextDate:'',amount:70000};await localApi('followups',body);await localApi('followups',body);assert.equal((await getData()).receivables[0].received,70000);await assert.rejects(localApi('followups',{...body,amount:60000}));});
await check('concurrent overpayment rejected atomically',async()=>{const v={projectId:p.id,receivableId:r.id,date:today(),method:'收款',content:'并发测试',nextDate:'',amount:20000};const results=await Promise.allSettled([localApi('followups',{...v,requestId:crypto.randomUUID()}),localApi('followups',{...v,requestId:crypto.randomUUID()})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await getData()).receivables[0].received,90000)});
await check('original attachment round trip',async()=>{const f=new FormData();f.set('projectId',p.id);f.set('category','竣工资料');f.set('file',new File(['中文原件\n测试内容'],'验收资料.txt',{type:'text/plain'}));doc=await localApi('upload',f);assert.equal(await(await getFile(doc.id)).text(),'中文原件\n测试内容')});
await check('estimate calculated from inputs',async()=>{const e=await localApi('estimates',{projectId:p.id,name:'测试报价',input:defaultEstimate});assert.equal(e.result.total,14216160);assert.ok(Math.abs(e.result.quantity-185.4)<1e-9)});
await check('complete backup includes original blobs',async()=>{await exportBackup();originalBackup=downloads.at(-1).blob;const entries=readBackupZip(await originalBackup.arrayBuffer());assert.equal(new TextDecoder().decode(entries.get('files/'+doc.id)),'中文原件\n测试内容');restored=await prepareRestore(new File([originalBackup],'完整备份.zip'));assert.equal(restored.data.projects[0].id,p.id);assert.equal(restored.files.size,1)});
await check('invalid backup rejected before replacement',async()=>{const corrupt=new Uint8Array(await originalBackup.arrayBuffer());corrupt[50]^=1;await assert.rejects(prepareRestore(new File([corrupt],'损坏.zip')));assert.equal((await getData()).projects[0].id,p.id);const bad={format:'zhuzhang-offline',version:1,data:structuredClone(restored.data)};bad.data.receivables[0].received=1;assert.throws(()=>validateBackup(bad),/不一致/)});
await check('restore replaces whole book and original files',async()=>{await localApi('projects',{...project,name:'临时工程'});assert.equal((await getData()).projects.length,2);await restoreBackup(restored);assert.equal((await getData()).projects.length,1);assert.equal(await(await getFile(doc.id)).text(),'中文原件\n测试内容')});
await check('project share contains one project and safe HTML',async()=>{await localApi('projects',{...project,name:'绝不能泄露的另一个工程'});await localApi('projects/'+p.id,{...project,name:'道路<script>alert(1)</script>'},'PATCH');await exportProject(p.id);const shared=readBackupZip(await downloads.at(-1).blob.arrayBuffer());const html=new TextDecoder().decode(shared.get('打开查看工程.html'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('绝不能泄露'));assert.ok([...shared.keys()].some(k=>k.endsWith('验收资料.txt')))});
await check('calendar exports due date and both alarms',async()=>{const cal=calendarText(await getData());assert.equal(cal.count,1);assert.ok(cal.text.includes('DTSTART;VALUE=DATE:20300927'));assert.ok(cal.text.includes('DTEND;VALUE=DATE:20300928'));assert.ok(cal.text.includes('TRIGGER:-P30D'));assert.ok(cal.text.includes('TRIGGER:-P1D'));assert.ok(cal.text.includes('待收 ¥100.00'));for(const line of cal.text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75)});
await check('no remotely enabled notifications in offline settings',async()=>{await localApi('settings',{company:'测试账本',reminderDays:7,invoiceThreshold:0,wecomEnabled:true,emailEnabled:true,reminderEmail:'qa@example.test'});const d=await getData();assert.equal(d.settings.emailEnabled,false);assert.equal(d.settings.wecomEnabled,false)});

await check('Android binary export is chunked and waits for native confirmation',async()=>{
 const payload=new Uint8Array(430001);for(let i=0;i<payload.length;i++)payload[i]=i%256;
 const chunks=[];let aborted=false;
 window.ZhuzhangNative={begin(name,mime,size){assert.equal(size,payload.length);return 'native-test'},write(id,base64){assert.equal(id,'native-test');assert.ok(base64.length<=262144);chunks.push(Buffer.from(base64,'base64'));return true},finish(id){queueMicrotask(()=>window.dispatchEvent(new CustomEvent('zhuzhang-native-save',{detail:{id,error:''}})));return true},abort(){aborted=true}};
 assert.equal(await saveNative(new Blob([payload]),'资料.zip'),true);assert.equal(chunks.length,3);assert.deepEqual(Buffer.concat(chunks),Buffer.from(payload));assert.equal(aborted,false);
 window.ZhuzhangNative.begin=()=>'native-test';window.ZhuzhangNative.write=()=>false;await assert.rejects(saveNative(new Blob(['data']),'资料.zip'));assert.equal(aborted,true);
 delete window.ZhuzhangNative;
});


await check('invoice attachment and record commit atomically',async()=>{
 const before=await snapshot();const record={...before.data.invoices[0]};
 const form=new FormData();form.set('file',new File(['原件'],'票.pdf'));form.set('invoice',JSON.stringify(record));
 await assert.rejects(localApi('invoice-with-file',form),/重复/);
 const after=await snapshot();assert.equal(after.data.documents.length,before.data.documents.length);assert.equal(after.files.size,before.files.size);
 record.number='20260927000000000111';form.set('invoice',JSON.stringify(record));const invoice=await localApi('invoice-with-file',form);
 assert.equal(await(await getFile(invoice.fileId)).text(),'原件');assert.equal((await getData()).documents.find(x=>x.id===invoice.fileId).projectId,p.id);
});
await check('invalid invoice rolls back uploaded original',async()=>{
 const before=await snapshot();const record={...before.data.invoices[0],number:'20260927000000000112',tax:999999999};
 const form=new FormData();form.set('file',new File(['原件'],'票.pdf'));form.set('invoice',JSON.stringify(record));await assert.rejects(localApi('invoice-with-file',form));
 assert.equal((await snapshot()).files.size,before.files.size);
});
await check('file name limit keeps upload and restore compatible',async()=>{
 const form=new FormData();form.set('projectId',p.id);form.set('category','其他资料');form.set('file',new File(['x'],'a'.repeat(197)+'.txt'));await assert.rejects(localApi('upload',form),/文件名/);
 form.set('file',new File(['x'],'a'.repeat(196)+'.txt'));await localApi('upload',form);await exportBackup();const backup=await prepareRestore(new File([downloads.at(-1).blob],'备份.zip'));assert.equal(backup.files.size,(await snapshot()).files.size);
});
await check('material quantities use correct centimetre and metre units',()=>{
 const b={...defaultEstimate,area:100,thickness:10,loss:5};assert.equal(calculateEstimate(b).quantity,10.5);
 assert.equal(calculateEstimate({...b,kind:'碎石垫层',thickness:20,density:1.5,factor:1,loss:0}).quantity,30);
 assert.ok(Math.abs(calculateEstimate({...b,kind:'道路划线',length:100,width:15,consumption:1.5,loss:10}).quantity-24.75)<1e-9);
 assert.throws(()=>calculateEstimate({...b,area:Number.MIN_VALUE}),/面积/);
});
await check('CSV preserves long identifiers and escapes formulas',()=>{
 const content=csv([['20260927000000000123','00123','=SUM(A1)',100,'正常文字']]);assert.ok(content.includes(`"'20260927000000000123"`));assert.ok(content.includes(`"'00123"`));assert.ok(content.includes(`"'=SUM(A1)"`));assert.ok(content.includes('"100"'));
});
await check('native cancellation propagates without browser fallback',async()=>{
 const before=downloads.length;window.ZhuzhangNative={begin(){return 'cancel-test'},write(){return true},finish(id){queueMicrotask(()=>window.dispatchEvent(new CustomEvent('zhuzhang-native-save',{detail:{id,error:'已取消保存'}})));return true},abort(){}};
 await assert.rejects(saveBlob(new Blob(['data']),'总览.csv'),/取消/);assert.equal(downloads.length,before);delete window.ZhuzhangNative;
});
fs.writeFileSync('test-build/verification.json',JSON.stringify({date:today(),checks:passed,result:'passed',environment:'Node.js with fake-indexeddb'},null,2));console.log('TOTAL '+passed+' integration checks passed.');
