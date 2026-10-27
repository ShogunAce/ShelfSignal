import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()],build:{rollupOptions:{input:{main:'index.html',workspace:'workspace/index.html'}}},server:{proxy:{'/api':{target:'http://127.0.0.1:8000',rewrite:p=>p.replace(/^\/api/,'')}}}});
