import {z} from 'zod';
import {projectSchema,invoiceSchema,receivableSchema,followupSchema,settingsSchema} from '../lib/validation';
import {calculateEstimate} from '../lib/calculator';
import {today,remaining,type Data} from '../lib/model';
export function applyMutation(d:Data,path:string,body:any,method:string){
 const[k,id]=path.split('/');const now=new Date().toISOString();
 const project=(pid:string)=>{if(!d.projects.some(p=>p.id===pid))throw Error('请先选择已保存的工程')};
 const replace=(arr:any[],record:any)=>{const i=arr.findIndex(x=>x.id===id);if(i<0)throw Error('记录不存在');const value={...arr[i],...record};arr[i]=value;return value};
 const add=(arr:any[],record:any)=>{const value={...record,id:crypto.randomUUID(),createdAt:now};arr.unshift(value);return value};
 if(k==='projects'){const v=projectSchema.parse(body);return method==='PATCH'?replace(d.projects,v):add(d.projects,v)}
 if(k==='invoices'){const v=invoiceSchema.parse(body);project(v.projectId);if(v.fileId&&!d.documents.some(f=>f.id===v.fileId&&f.projectId===v.projectId))throw Error('发票原件不属于当前工程');const key=(x:any)=>x.number.length>=20?x.number:x.code+':'+x.number;if(d.invoices.some(x=>x.id!==id&&key(x)===key(v)))throw Error('该发票号码已录入，请勿重复保存');return method==='PATCH'?replace(d.invoices,v):add(d.invoices,v)}
 if(k==='receivables'){const v=receivableSchema.parse(body);project(v.projectId);if(method==='PATCH'){const old=d.receivables.find(x=>x.id===id);if(!old)throw Error('款项不存在');if(old.projectId!==v.projectId)throw Error('不能变更款项所属工程');if(v.amount<old.received)throw Error('应收金额不能小于已收金额');return replace(d.receivables,v)}return add(d.receivables,{...v,received:0})}
 if(k==='followups'){const {requestId,...v}=followupSchema.parse(body);const existing=d.followups.find(x=>x.id===requestId);if(existing){if(Object.entries(v).some(([k,val])=>(existing as any)[k]!==val))throw Error('此请求已保存，请刷新后重新登记');return existing}const r=d.receivables.find(x=>x.id===v.receivableId&&x.projectId===v.projectId);if(!r)throw Error('款项与工程不匹配');if(v.method==='收款'&&v.amount<=0)throw Error('收款金额需大于 0');if(v.method!=='收款'&&v.amount!==0)throw Error('请选择收款方式记录到账');if(v.amount>remaining(r))throw Error('收款金额不能超过待收余额');if(v.date>today())throw Error('记录日期不能晚于今天');if(v.nextDate&&v.nextDate<v.date)throw Error('下次跟进不能早于本次日期');const value={...v,id:requestId,createdAt:now};d.followups.unshift(value);r.received+=v.amount;return value}
 if(k==='settings'){const v=settingsSchema.parse(body);d.settings={...v,wecomEnabled:false,emailEnabled:false,reminderEmail:''};return d.settings}
 if(k==='estimates'){project(body.projectId);const name=z.string().trim().min(1).max(100).parse(body.name),input=body.input;const keys=['kind','area','thickness','length','width','density','factor','consumption','loss','price','labor','machine','transport','markup','tax'];if(!input||Object.keys(input).length!==keys.length||keys.some(k=>!(k in input)))throw Error('报价参数不完整');return add(d.estimates,{projectId:body.projectId,name,input,result:calculateEstimate(input)})}
 throw Error('离线版不支持此操作');
}
export function validateBackup(raw:any):Data{
 if(!raw||raw.format!=='zhuzhang-offline'||raw.version!==1)throw Error('这不是筑账离线版备份');const d=raw.data as Data;
 const arrays=['projects','invoices','receivables','followups','documents','estimates'];if(!d||arrays.some(k=>!Array.isArray((d as any)[k])||(d as any)[k].length>50000))throw Error('备份内容不完整或记录过多');
 const ids=new Set<string>();const meta=(v:any)=>{if(typeof v.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(v.id)||ids.has(v.id)||typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt)))throw Error('备份记录编号或日期无效');ids.add(v.id)};
 d.projects=d.projects.map(p=>{meta(p);return{...projectSchema.parse(p),id:p.id,createdAt:p.createdAt}});
 const project=(pid:string)=>{if(!d.projects.some(p=>p.id===pid))throw Error('备份存在未关联工程的记录')};const numbers=new Set();
 d.documents=d.documents.map(f=>{meta(f);project(f.projectId);if(typeof f.name!=='string'||f.name.length>200||!['合同协议','发票原件','竣工资料','现场照片','其他资料'].includes(f.category)||!Number.isInteger(f.size)||f.size<1||f.size>10*1024*1024)throw Error('备份资料信息无效');return{id:f.id,projectId:f.projectId,name:f.name,category:f.category,size:f.size,mime:typeof f.mime==='string'?f.mime:'application/octet-stream',key:'files/'+f.id,createdAt:f.createdAt}});
 d.invoices=d.invoices.map(i=>{meta(i);project(i.projectId);const v=invoiceSchema.parse(i);const key=i.number.length>=20?i.number:i.code+':'+i.number;if(numbers.has(key))throw Error('备份存在重复发票');numbers.add(key);if(v.fileId&&!d.documents.some(f=>f.id===v.fileId&&f.projectId===v.projectId))throw Error('备份发票原件关联错误');return{...v,id:i.id,createdAt:i.createdAt}});
 d.receivables=d.receivables.map(r=>{meta(r);project(r.projectId);const v=receivableSchema.parse(r);if(!Number.isSafeInteger(r.received)||r.received<0||r.received>r.amount)throw Error('备份的已收金额无效');return{...v,id:r.id,createdAt:r.createdAt,received:r.received}});
 d.followups=d.followups.map(f=>{meta(f);project(f.projectId);const {requestId,...v}=followupSchema.parse({...f,requestId:f.id});if(!d.receivables.some(r=>r.id===f.receivableId&&r.projectId===f.projectId))throw Error('备份跟进关联错误');if((v.method==='收款'&&v.amount<=0)||(v.method!=='收款'&&v.amount!==0))throw Error('备份跟进金额无效');return{...v,id:f.id,createdAt:f.createdAt}});
 for(const r of d.receivables)if(d.followups.filter(f=>f.receivableId===r.id).reduce((s,f)=>s+f.amount,0)!==r.received)throw Error('备份收款明细与余额不一致');
 d.estimates=d.estimates.map(e=>{meta(e);project(e.projectId);if(typeof e.name!=='string'||e.name.length>100)throw Error('备份报价名称无效');const result=calculateEstimate(e.input);return{...e,result}});
 d.settings={...settingsSchema.parse(d.settings),wecomEnabled:false,emailEnabled:false,reminderEmail:''};d.shares=[];delete d.services;delete d.authenticated;return {projects:d.projects,invoices:d.invoices,receivables:d.receivables,followups:d.followups,documents:d.documents,estimates:d.estimates,settings:d.settings,shares:[]};
}
