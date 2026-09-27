export type InvoiceFields={number:string;code:string;seller:string;buyer:string;amount:number|null;tax:number|null;date:string};
export type InvoiceRecognition=InvoiceFields&{text:string;warnings:string[]};
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function parseInvoiceText(source:string):InvoiceRecognition{
 const text=source.normalize('NFKC').replace(/\r/g,'').slice(0,100000),lines=text.split('\n').map(x=>x.replace(/[ \t\u3000]/g,'')).filter(Boolean),s=lines.join('\n');
 const money=(raw:string|undefined)=>{if(!raw)return null;const n=Number(raw.replace(/[,，]/g,''));return Number.isFinite(n)&&n>=0&&n<=1e11?Math.round(n*100):null};
 const num=s.match(/(?:发票号码|发票号|票据号码|票号)[:：]?\s*([0-9]{8,30})(?!\d)/)?.[1]||'';
 const code=s.match(/发票代码[:：]?\s*(\d{10,12})(?!\d)/)?.[1]||'';
 const dateParts=s.match(/(?:开票日期|出票日期)[:：]?\s*(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?/);
 const date=dateParts?`${dateParts[1]}-${dateParts[2].padStart(2,'0')}-${dateParts[3].padStart(2,'0')}`:'';
 const moneyPattern='([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]{1,2})?|[0-9]{1,11}(?:\\.[0-9]{1,2})?)(?![0-9.,])';
 const total=s.match(new RegExp('(?:\\(小写\\)|小写)[:：]?[¥￥]?'+moneyPattern))||s.match(new RegExp('价税合计[:：]?[¥￥]?'+moneyPattern));
 let amount=money(total?.[1]),tax:number|null=null;
 const sums=lines.find(x=>/^合计[:：¥￥\d]/.test(x));
 if(sums){const values=[...sums.matchAll(/(?:[¥￥])?([0-9]+(?:,[0-9]{3})*\.[0-9]{2})/g)].map(m=>money(m[1]));if(values.length===2&&values.every(v=>v!==null)){tax=values[1];if(amount===null)amount=values[0]!+values[1]!;}}
 const taxMatch=s.match(new RegExp('(?:税额合计|合计税额|税额)[:：][¥￥]?'+moneyPattern));if(taxMatch)tax=money(taxMatch[1]);
 if(/(?:税额[:：]?|合计)\*{3}/.test(s)&&/免税|不征税/.test(s))tax=0;
 function company(role:'购买方'|'销售方'){
  const explicit=s.match(new RegExp(role+'(?:名称|公司)[:：]?([^\\n]{2,100})'));if(explicit)return explicit[1].split(/(?:纳税人识别号|统一社会信用代码)/)[0];
  const start=s.indexOf(role);if(start<0)return '';const other=s.indexOf(role==='购买方'?'销售方':'购买方',start+3);const block=s.slice(start,other<0?start+220:other);
  return block.match(/名称[:：]([^\n]{2,100})/)?.[1].split(/(?:纳税人识别号|统一社会信用代码)/)[0]||'';
 }
 const result={number:num,code,seller:company('销售方'),buyer:company('购买方'),amount,tax,date:validDate(date)?date:'',text,warnings:[] as string[]};
 if(amount!==null&&tax!==null&&tax>amount){result.tax=null;result.warnings.push('税额大于价税合计，已留空，请对照原件填写。')}
 const missing=[!result.number&&'票号',!result.seller&&'销售方',!result.date&&'日期',result.amount===null&&'价税合计',result.tax===null&&'税额'].filter(Boolean);
 if(missing.length)result.warnings.push('未可靠识别：'+missing.join('、')+'。请手动补齐。');
 result.warnings.push('识别仅作辅助，请核对票号、购销方和金额；不会自动入账或验真。');return result;
}
