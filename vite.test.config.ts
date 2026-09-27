import {defineConfig} from 'vite';
import path from 'node:path';
export default defineConfig({build:{outDir:'test-build',emptyOutDir:true,target:'es2022',minify:false,lib:{entry:path.resolve('offline/test-entry.ts'),formats:['es'],fileName:'api'}}});
