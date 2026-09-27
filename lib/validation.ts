import {z} from 'zod';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s,'日期无效');
const optionalDate=z.union([date,z.literal('')]).default('');
const text=z.string().trim().max(500),cents=z.number().int().min(0).max(1e13),id=z.string().min(1).max(100);
const projectSchema=z.object({name:text.min(1,'请填写项目名称'),code:text,client:text,manager:text,phone:text,location:text,category:z.enum(['道路工程','排水工程','园林工程','照明工程','配套工程','地坪工程','碎石工程','划线工程','其他工程']),status:z.enum(['施工中','已竣工','质保期','已归档']),contract:cents,invoiceTarget:cents,invoiceDue:optionalDate,completedAt:optionalDate,note:text});
const invoiceSchema=z.object({projectId:id,number:z.string().trim().regex(/^\d{8,30}$/,'发票号码应为 8～30 位数字'),code:z.string().trim().regex(/^\d{0,20}$/,'发票代码应为数字'),seller:text.min(1,'请填写销售方'),buyer:text,amount:cents.positive(),tax:cents,date,category:z.enum(['材料费','机械费','人工费','分包费','运输费','其他费用']),status:z.enum(['待核对','已核对','已作废']),fileId:z.string().max(100).default('')}).refine(v=>v.tax<=v.amount,{message:'税额不能大于价税合计',path:['tax']});
const receivableSchema=z.object({projectId:id,type:z.enum(['质保金','尾款']),amount:cents.positive(),due:date,reminderDays:z.number().int().min(1).max(730),contact:text,note:text});
const followupSchema=z.object({projectId:id,receivableId:id,date,method:z.enum(['电话','微信','当面','邮件','收款','其他']),content:text.min(1,'请填写跟进内容'),nextDate:optionalDate,amount:cents.default(0),requestId:z.string().uuid()});
const settingsSchema=z.object({company:text.min(1),reminderDays:z.number().int().min(1).max(730),invoiceThreshold:cents,wecomEnabled:z.boolean(),emailEnabled:z.boolean().default(false),reminderEmail:z.union([z.string().email(),z.literal('')]).default('')});

export {projectSchema,invoiceSchema,receivableSchema,followupSchema,settingsSchema};
