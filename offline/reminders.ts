import {type Data,remaining,gap} from '../lib/model';
export type LocalNotice={id:string;title:string;body:string;start:string};
const shifted=(date:string,days:number)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
export function reminderPayload(d:Data):LocalNotice[]{
 const items:LocalNotice[]=[];
 for(const r of d.receivables){if(!remaining(r))continue;const p=d.projects.find(p=>p.id===r.projectId);if(!p)continue;items.push({id:'due-'+r.id,title:p.name+' · '+r.type,body:`到期 ${r.due}，待收 ${(remaining(r)/100).toFixed(2)} 元`,start:shifted(r.due,-r.reminderDays)});
 const f=d.followups.filter(f=>f.receivableId===r.id&&f.method!=='收款'&&!f.voidedAt).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];if(f?.nextDate)items.push({id:'follow-'+r.id,title:p.name+' · 催收跟进',body:'计划跟进日 '+f.nextDate+'，请打开筑账查看记录',start:f.nextDate});}
 for(const p of d.projects){const missing=gap(d,p);if(p.status!=='已归档'&&missing>d.settings.invoiceThreshold)items.push({id:'invoice-'+p.id,title:p.name+' · 缺票',body:`待补成本票 ${(missing/100).toFixed(2)} 元`,start:p.invoiceDue||'2000-01-01'})}
 return items;
}
export function syncReminders(d:Data){const native=(window as any).ZhuzhangNative;if(native?.syncReminders)native.syncReminders(JSON.stringify(reminderPayload(d)))}
