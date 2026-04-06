/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional canonical origin override (e.g. https://getgomate.com) */
  readonly VITE_SITE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
