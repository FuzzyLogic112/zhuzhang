import React,{useEffect,useState} from 'react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {getFile} from './storage';
import {type DocumentRecord,type Data} from '../lib/model';
import {hasImageOcr} from './ocr';
import {syncReminders} from './reminders';
export function PreviewFile({file}:{file:DocumentRecord}){
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(!open)return;let active=true,current='';setError('');setUrl('');(async()=>{let blob=await getFile(file.id);if(/\.pdf$/i.test(file.name)){const{readPdf}=await import('./pdf');blob=(await readPdf(blob,true)).image!}else if(!/\.(png|jpe?g|webp)$/i.test(file.name))throw Error('此格式请下载后使用对应软件查看');current=URL.createObjectURL(blob);if(active)setUrl(current);else URL.revokeObjectURL(current)})().catch(e=>{if(active)setError(e.message)});return()=>{active=false;if(current)URL.revokeObjectURL(current)}},[open,file.id]);
 return <><button className="text-btn" onClick={()=>setOpen(true)}>预览</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="dialog-content"><DialogHeader><DialogTitle>资料预览</DialogTitle><DialogDescription>{file.name}{/\.pdf$/i.test(file.name)?' · 仅展示首页':''}</DialogDescription></DialogHeader>{error?<p role="alert">{error}</p>:url?<img src={url} alt={file.name} style={{maxHeight:'70vh',objectFit:'contain',width:'100%'}}/>:<p>正在读取原件…</p>}<a className="btn" href={'/api/files/'+file.id}>下载原件</a></DialogContent></Dialog></>
}
export function NativeFeatures({data}:{data:Data}){
 const native=(window as any).ZhuzhangNative;
 const [state,setState]=useState({enabled:false,allowed:false});
 const refresh=()=>{try{if(native?.reminderStatus)setState(JSON.parse(native.reminderStatus()))}catch{}};
 useEffect(()=>{refresh();const onFocus=()=>refresh();window.addEventListener('focus',onFocus);const timer=setInterval(refresh,2000);return()=>{clearInterval(timer);window.removeEventListener('focus',onFocus)}},[]);
 return <section className="panel settings-card"><h2>APP 增强功能 · 1.2.0</h2><p className="section-desc">{hasImageOcr()?'已内置本地图片识别，安装后无需联网。发票可选图片或 PDF 首页，识别后核对保存。':'当前入口支持粘贴票面文字、读取含文字的 PDF；图片离线识别请使用安卓或电脑安装版。'}</p>{native?.enableReminders?<><h3 className="section-title">本机到期提醒</h3><p>当前：{state.enabled?(state.allowed?'已开启，通知权限可用':'已开启，但系统通知被关闭'):'未开启'}</p><p className="section-desc">每天北京时间 9 点后汇总质保金、尾款、催收和缺票。关闭界面后仍可提醒；强行停止、关机或系统省电可能阻止或延迟通知。</p><div className="button-row mt-4"><button className="btn primary" onClick={()=>{syncReminders(data);native.enableReminders(!state.enabled);setTimeout(refresh,600)}}>{state.enabled?'关闭本机提醒':'开启本机提醒'}</button><button className="btn" onClick={()=>{refresh();if(!JSON.parse(native.reminderStatus()).allowed){toast.info('请先允许系统通知');return}native.testNotification();toast.success('已请求发送测试通知，请检查通知栏')}}>测试通知</button><button className="text-btn" onClick={()=>native.notificationSettings()}>系统通知设置</button></div></>:<p className="help-note">电脑和网页关闭后请使用“导出日历提醒”。本机后台通知目前由安卓版提供。</p>}<details className="mt-5"><summary>新手帮助与常见问题</summary><p className="section-desc mt-4">先建工程，再录发票和回款。拍照后点“识别并填入”；PDF 多页仅处理首页，OFD 请先转换为 PDF。识别不确定的字段会留空，核对后才计入收票。</p><p className="section-desc mt-4">到账录错时，在工程详情的收款记录选择“撤销收款”，填原因后确认。原记录保留，待收金额恢复，再登记正确金额。</p><p className="section-desc mt-4">备份包含完整账本和原件，恢复会替换当前账本。工程包只供对方查看。手机和电脑各自保存，不会自动同步；更新或清理设备前请先备份。</p><p className="section-desc mt-4">识别不是发票真伪查验；本版不提供微信或短信后台推送。安卓可保存文件，也可打开系统分享菜单发送工程包。</p></details></section>
}
