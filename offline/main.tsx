import React from 'react';
import {createRoot} from 'react-dom/client';
import {toast} from 'sonner';
import Workspace from '../app/workspace';
import {downloadFile} from './storage';
import '../app/globals.css';
document.addEventListener('click',e=>{const a=(e.target as Element).closest?.('a[href]');const href=a?.getAttribute('href');if(href?.startsWith('/api/files/')){e.preventDefault();void downloadFile(href.slice('/api/files/'.length)).catch(e=>toast.error(e.message))}});
createRoot(document.getElementById('root')!).render(<Workspace/>);
