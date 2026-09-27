import * as pdfjs from 'pdfjs-dist';
export async function readPdf(file:Blob,render=false){
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./pdf/pdf.worker.min.mjs',location.href).href;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),maxImageSize:12000000,useSystemFonts:true,standardFontDataUrl:new URL('./pdf/standard_fonts/',location.href).href,wasmUrl:new URL('./pdf/wasm/',location.href).href});
 try{const doc=await task.promise,page=await doc.getPage(1),content=await page.getTextContent();let text='',lastY:number|undefined;
 for(const item of content.items){if(!('str'in item))continue;const y=item.transform[5];if(lastY!==undefined&&Math.abs(y-lastY)>4)text+='\n';text+=item.str+' ';lastY=y;if(item.hasEOL)text+='\n'}
 let image:Blob|undefined;
 if(render){const base=page.getViewport({scale:1}),scale=Math.min(2,2000/Math.max(base.width,base.height)),viewport=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,viewport}).promise;image=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PDF 页面转图片失败')),'image/png'));canvas.width=0;canvas.height=0}
 return{text,image,pages:doc.numPages};
 }catch(e){throw Error('PDF 无法读取，可能已加密或格式不支持：'+(e instanceof Error?e.message:'请换一份文件'))}finally{await task.destroy()}
}
