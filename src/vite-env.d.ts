/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLM_API_KEY?: string;
  readonly VITE_GLM_MODEL?: string;
  /** 大模型请求超时（毫秒），默认 45000 */
  readonly VITE_GLM_TIMEOUT_MS?: string;
  /** 纯前端 Mock 统一请求延迟（毫秒）；不设置或 0 为最快 */
  readonly VITE_MOCK_LATENCY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
