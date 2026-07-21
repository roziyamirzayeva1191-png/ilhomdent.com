import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Vendor split: react core cached separately from app code
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            'vendor-motion': ['motion'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
