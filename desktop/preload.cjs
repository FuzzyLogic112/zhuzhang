const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ZhuzhangDesktop',Object.freeze({recognize:bytes=>ipcRenderer.invoke('invoice:recognize',bytes)}));
