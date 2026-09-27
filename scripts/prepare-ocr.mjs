import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const models={chi_sim:'a5fcb6f0db1e1d6d8522f39db4e848f05984669172e584e8d76b6b3141e1f730',eng:'7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'};
await fs.mkdir('desktop/ocr',{recursive:true});
for(const [lang,hash] of Object.entries(models)){
 const path=`desktop/ocr/${lang}.traineddata`;let bytes;try{bytes=await fs.readFile(path)}catch{}
 if(!bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==hash){const response=await fetch(`https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${lang}.traineddata`);if(!response.ok)throw Error('OCR model download failed');bytes=Buffer.from(await response.arrayBuffer());if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('OCR model checksum mismatch');await fs.writeFile(path,bytes)}
 console.log('Verified bundled OCR model:',lang);
}
