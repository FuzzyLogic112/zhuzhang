// Streaming UTF-8 ZIP (store method) with bounded memory and backpressure.
const table=new Uint32Array(256);for(let i=0;i<256;i++){let n=i;for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;table[i]=n>>>0;}
const enc=new TextEncoder();
function header(size:number,fields:[number,number,2|4][]){const a=new Uint8Array(size),v=new DataView(a.buffer);for(const[o,n,w]of fields)w===2?v.setUint16(o,n,true):v.setUint32(o,n,true);return a;}
export type ZipEntry={name:string;load:()=>Promise<ReadableStream<Uint8Array>|Uint8Array>};
export function zipStream(entries:ZipEntry[]){
 async function* generate(){let offset=0;const central:Uint8Array[]=[];const count=(b:Uint8Array)=>{offset+=b.length;return b;};
  for(const e of entries){const name=enc.encode(e.name),start=offset;yield count(header(30,[[0,0x04034b50,4],[4,20,2],[6,0x0808,2],[26,name.length,2]]));yield count(name);let crc=0xffffffff,size=0;
   const add=(b:Uint8Array)=>{for(const x of b)crc=table[(crc^x)&255]^(crc>>>8);size+=b.length;return count(b);};
   const payload=await e.load();if(payload instanceof Uint8Array)yield add(payload);else{const reader=payload.getReader();try{while(true){const{done,value}=await reader.read();if(done)break;yield add(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
   crc=(crc^0xffffffff)>>>0;yield count(header(16,[[0,0x08074b50,4],[4,crc,4],[8,size,4],[12,size,4]]));
   central.push(header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0808,2],[16,crc,4],[20,size,4],[24,size,4],[28,name.length,2],[42,start,4]]),name);
  }const start=offset;for(const chunk of central)yield count(chunk);const size=offset-start;yield count(header(22,[[0,0x06054b50,4],[8,entries.length,2],[10,entries.length,2],[12,size,4],[16,start,4]]));
 }
 const iterator=generate();return new ReadableStream<Uint8Array>({async pull(controller){try{const{done,value}=await iterator.next();if(done)controller.close();else controller.enqueue(value);}catch(e){controller.error(e)}},async cancel(){await iterator.return(undefined)}});
}
export function csv(rows:(string|number)[][]){return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s)||(typeof v==='string'&&/^(?:\d{16,}|0\d+)$/.test(s)))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
