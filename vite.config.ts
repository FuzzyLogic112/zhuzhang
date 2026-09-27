import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({plugins:[react()],resolve:{alias:{'@':path.resolve('.')}},build:{outDir:'build',emptyOutDir:true,target:'es2022',lib:{entry:path.resolve('offline/main.tsx'),name:'ZhuzhangOffline',formats:['iife'],fileName:'app'},cssCodeSplit:false,minify:true},define:{'process.env.NODE_ENV':'"production"'}});
