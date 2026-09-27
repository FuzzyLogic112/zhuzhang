import fs from 'node:fs';
for(const folder of ['desktop/web','android/app/src/main/assets']){
  fs.mkdirSync(folder,{recursive:true});
  fs.copyFileSync('build/offline.html',folder+'/index.html');
  fs.cpSync('docs/pdf',folder+'/pdf',{recursive:true});
}
