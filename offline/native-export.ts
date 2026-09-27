type NativeFiles = { begin(name:string,mime:string,size:number):string; write(id:string,chunk:string):boolean; finish(id:string):boolean; share?(id:string):boolean; abort(id:string):void };
export async function saveNative(blob:Blob,name:string,share=false):Promise<boolean> {
  const bridge=(window as unknown as {ZhuzhangNative?:NativeFiles}).ZhuzhangNative;
  if(!bridge)return false;
  const id=bridge.begin(name,blob.type||'application/octet-stream',blob.size);
  if(!id)throw Error('已有文件正在导出，或文件过大，请稍后再试');
  let handler:EventListener|undefined;
  try {
    for(let start=0;start<blob.size;start+=192*1024){
      const bytes=new Uint8Array(await blob.slice(start,start+192*1024).arrayBuffer());
      let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      if(!bridge.write(id,btoa(binary)))throw Error('文件导出未完成，请检查设备空间后重试');
    }
    await new Promise<void>((resolve,reject)=>{
      handler=((event:CustomEvent)=>{if(event.detail?.id!==id)return;window.removeEventListener('zhuzhang-native-save',handler!);event.detail.error?reject(Error(event.detail.error)):resolve()}) as EventListener;
      window.addEventListener('zhuzhang-native-save',handler);
      if(!(share&&bridge.share?bridge.share(id):bridge.finish(id)))reject(Error('无法开始保存文件，请重试'));
    });
    return true;
  } catch(error) { bridge.abort(id);throw error; }
  finally { if(handler)window.removeEventListener('zhuzhang-native-save',handler); }
}
