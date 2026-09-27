import {parseInvoiceText} from './invoice-parser';
export const hasImageOcr=()=>typeof window!=='undefined'&&!!((window as any).ZhuzhangOcr||(window as any).ZhuzhangDesktop?.recognize);
export async function recognizeInvoice(file:File,onProgress:(text:string)=>void=()=>{}){
 if(!file.size||file.size>10*1024*1024)throw Error('请选择不超过 10MB 的图片或 PDF');
 let image:Blob=file,pdfNote='';
 if(/\.pdf$/i.test(file.name)||file.type==='application/pdf'){
  onProgress('正在读取 PDF 首页…');const {readPdf}=await import('./pdf');const pdf=await readPdf(file);pdfNote='PDF 仅识别首页；多张发票请分别导入。';
  if(pdf.text.replace(/\s/g,'').length>50&&/发票|价税/.test(pdf.text)){const r=parseInvoiceText(pdf.text);r.warnings.unshift(pdfNote);return r}
  image=(await readPdf(file,true)).image!;
 }else if(!/\.(png|jpe?g|webp)$/i.test(file.name))throw Error('自动识别支持 JPG、PNG、WEBP 和 PDF 首页；OFD 可归档，或先转换为 PDF。');
 onProgress('正在本机识别，请稍候…');let text:string;
 const native=(window as any).ZhuzhangOcr,desktop=(window as any).ZhuzhangDesktop;
 if(native){
  const id=native.begin(image.size);if(!id)throw Error('已有识别任务正在进行，请稍后重试');
  let handler:EventListener|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  try{
   for(let start=0;start<image.size;start+=192*1024){const b=new Uint8Array(await image.slice(start,start+192*1024).arrayBuffer());let s='';for(let n=0;n<b.length;n+=8192)s+=String.fromCharCode(...b.subarray(n,n+8192));if(!native.write(id,btoa(s)))throw Error('图片传入失败，请重新选择')}
   text=await new Promise<string>((resolve,reject)=>{handler=((e:CustomEvent)=>{if(e.detail?.id!==id)return;e.detail.error?reject(Error(e.detail.error)):resolve(e.detail.text||'')}) as EventListener;window.addEventListener('zhuzhang-ocr',handler);timer=setTimeout(()=>reject(Error('识别超时，请裁剪票面后重试')),90000);if(!native.recognize(id))reject(Error('无法启动识别'))});
  }finally{if(handler)window.removeEventListener('zhuzhang-ocr',handler);if(timer)clearTimeout(timer);native.abort(id)}
 }else if(desktop?.recognize){text=await desktop.recognize(new Uint8Array(await image.arrayBuffer()))}
 else throw Error('图片离线识别请使用新版安卓或电脑安装包；此处可粘贴票面文字，或读取含文字的 PDF。');
 if(!text.trim())throw Error('未识别到文字，请对准票面、保持清晰后重试');
 const r=parseInvoiceText(text);if(pdfNote)r.warnings.unshift(pdfNote);return r;
}
