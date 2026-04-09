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
    build: {
      /** 更长缓存、并行下载，减小首包解析与执行（不改变运行时 UI） */
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/scheduler/') ||
              id.match(/[/\\]node_modules[/\\]react[/\\]/)
            ) {
              return 'react-vendor';
            }
            if (id.includes('@ant-design/icons')) {
              return 'antd-icons';
            }
            if (id.includes('antd') || id.includes('@ant-design') || id.includes('/rc-')) {
              return 'antd-rc';
            }
            if (id.includes('zustand') || id.includes('dayjs')) {
              return 'utils-vendor';
            }
          },
        },
      },
      target: 'es2022',
      /** 生产环境移除 debugger，略减体积与分支 */
      esbuild: { drop: ['debugger'] },
    },
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
