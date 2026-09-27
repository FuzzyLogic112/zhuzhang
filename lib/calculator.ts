export type EstimateInput={kind:string;area:number;thickness:number;length:number;width:number;density:number;factor:number;consumption:number;loss:number;price:number;labor:number;machine:number;transport:number;markup:number;tax:number};
export const defaultEstimate:EstimateInput={kind:'混凝土地坪',area:1200,thickness:15,length:500,width:15,density:1.5,factor:1,consumption:1.5,loss:3,price:450,labor:25,machine:10,transport:1500,markup:12,tax:0};
export const estimateKinds=['混凝土地坪','混凝土道路','碎石垫层','沥青道路','道路划线'];
export function calculateEstimate(p:EstimateInput){
 if(!estimateKinds.includes(p.kind))throw Error('请选择工程类型');
 for(const [k,v] of Object.entries(p))if(k!=='kind'&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e8))throw Error('请输入有效的非负数值');
 if(p.loss>100||p.markup>500||p.tax>100)throw Error('损耗、加价或税率超出合理输入范围');
 const line=p.kind==='道路划线',bulk=p.kind==='碎石垫层'||p.kind==='沥青道路';
 if((line&&(p.length<=0||p.width<=0||p.consumption<=0))||(!line&&(p.area<=0||p.thickness<=0))||(bulk&&(p.density<=0||p.factor<=0)))throw Error('面积、厚度及用料参数需大于 0');
 const area=line?p.length*p.width/100:p.area;
 const volume=line?0:area*p.thickness/100;
 const quantity=(line?area*p.consumption:bulk?volume*p.factor*p.density:volume)*(1+p.loss/100);
 const unit=line?'kg':bulk?'吨':'m³';
 const material=Math.round(quantity*p.price*100),labor=Math.round(area*p.labor*100),machine=Math.round(area*p.machine*100),transport=Math.round(p.transport*100);
 const cost=material+labor+machine+transport,profit=Math.round(cost*p.markup/100),tax=Math.round((cost+profit)*p.tax/100),total=cost+profit+tax;
 if(!Number.isSafeInteger(total)||total>1e14)throw Error('计算结果过大，请检查单位与输入');
 const perSquare=Math.round(total/area);if(!Number.isSafeInteger(perSquare))throw Error('每平方米报价超出范围，请检查面积单位');
 return{area,volume,quantity,unit,material,labor,machine,transport,cost,profit,tax,total,perSquare};
}
