const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {recognize}=require('../desktop/recognize.cjs');
(async()=>{
 await assert.rejects(recognize(new Uint8Array([1,2,3,4]),path.resolve('desktop/ocr')));
 const text=await recognize(new Uint8Array(fs.readFileSync('test-fixtures/invoice-ocr.png')),path.resolve('desktop/ocr'));
 const {parseInvoiceText}=await import('../test-build/api.js');const fields=parseInvoiceText(text);
 assert.equal(fields.number,'20260927000000000123');assert.equal(fields.amount,452000);assert.equal(fields.tax,52000);assert.equal(fields.date,'2026-09-27');
 assert.match(fields.seller,/测试建材/);assert.match(fields.buyer,/测试道路/);
 console.log('PASS real bundled desktop OCR: invoice number, total, tax, date, buyer and seller');
 fs.writeFileSync('test-build/ocr-result.json',JSON.stringify(fields,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
