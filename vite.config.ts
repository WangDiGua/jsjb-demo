import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** 浏览器只请求同源 /glm-api/*，由开发/预览服务器转发到真实网关（避免 CORS、不暴露密钥至公网仓库说明仍适用） */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const glmTarget = env.VITE_GLM_PROXY_TARGET?.trim() || 'https://dashscope.aliyuncs.com';
  const glmPrefix = env.VITE_GLM_PROXY_PREFIX?.trim() || '/compatible-mode/v1';

  const glmProxy = {
    '/glm-api': {
      target: glmTarget,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/glm-api/, glmPrefix),
    },
  };

  return {
    /** 相对路径，避免直接打开 dist/index.html 或子目录部署时 /assets/* 404 导致「全无样式」 */
    base: '/',
    plugins: [react()],
    server: {
      proxy: glmProxy,
    },
    preview: {
      proxy: glmProxy,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
  };
});
