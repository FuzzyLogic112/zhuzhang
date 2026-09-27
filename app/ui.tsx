'use client';
import React from 'react';
import {localApi} from '../offline/storage';
import {FolderOpen,Search} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Empty,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription,EmptyContent} from '@/components/ui/empty';
export function Choice({value,onChange,options,label,className=''}:{value:string;onChange:(s:string)=>void;options:(string|{value:string;label:string})[];label:string;className?:string}){return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className={'!bg-white !h-10 !text-sm !shadow-none '+className}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{options.map(x=>{const v=typeof x==='string'?x:x.value,l=typeof x==='string'?x:x.label;return <SelectItem key={v} value={v}>{l}</SelectItem>})}</SelectContent></Select>}
export function Field({label,wide=false,hint,children}:{label:string;wide?:boolean;hint?:string;children:React.ReactNode}){return <label className={'field'+(wide?' wide':'')}><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
export function SearchBox({value,onChange,placeholder='搜索项目名称、编号'}:{value:string;onChange:(s:string)=>void;placeholder?:string}){return <label className="search-input"><Search size={16}/><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></label>}
export function EmptyBox({title='还没有记录',description='添加第一条记录，开始管理你的工程。',action,label='新建项目'}:{title?:string;description?:string;action?:()=>void;label?:string}){return <Empty className="empty-state"><EmptyHeader><EmptyMedia><FolderOpen size={38}/></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{action&&<EmptyContent><button className="btn primary" onClick={action}>{label}</button></EmptyContent>}</Empty>}
export function Tag({children,color}:{children:React.ReactNode;color?:string}){const text=String(children);const c=color||(['已逾期','已作废'].includes(text)?'red':['即将到期','待核对','质保期'].includes(text)?'orange':['已收齐','已核对','已归档'].includes(text)?'green':text==='施工中'?'blue':'gray');return <span className={'tag '+c}>{children}</span>}
export async function api(path:string,body?:unknown,method='POST'){return localApi(path,body,method)}
export function download(name:string,content:string,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
export const moneyInput=(n:number)=>String(n/100);
export const toCents=(s:string)=>Math.round(Number(s)*100);
