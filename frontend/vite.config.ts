import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:9000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, '../shared'),
      },
    },
    server: {
      port: 5000,
      host: '0.0.0.0',
      strictPort: true,
      cors: true,
      hmr: {
        host: 'localhost',
        // 不指定 port，让 Vite 自动分配 HMR 端口
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5175,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});