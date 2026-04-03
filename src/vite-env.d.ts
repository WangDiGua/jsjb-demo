/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLM_API_KEY?: string;
  readonly VITE_GLM_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
