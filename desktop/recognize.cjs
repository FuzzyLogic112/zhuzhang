const {createWorker}=require('tesseract.js');
const fs=require('node:fs');
let busy=false;
async function recognize(bytes,langPath){
 if(busy)throw Error('已有识别任务，请稍后重试');
 if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>10*1024*1024)throw Error('图片不能超过 10MB');
 busy=true;let worker,timer,expired=false;
 try{
  const source=require.resolve('tesseract.js/src/worker-script/node/index.js'),unpacked=source.replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
  const run=async()=>{worker=await createWorker('chi_sim+eng',1,{langPath,workerPath:fs.existsSync(unpacked)?unpacked:source,gzip:false,cacheMethod:'none',errorHandler:()=>{}});if(expired){await worker.terminate();throw Error('识别已取消')}await worker.setParameters({preserve_interword_spaces:'1'});return(await worker.recognize(Buffer.from(bytes))).data.text;};
  return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('识别超时，请裁剪票面后重试'))},90000)})]);
 }finally{clearTimeout(timer);try{if(worker)await worker.terminate()}finally{busy=false}}
}
module.exports={recognize};
