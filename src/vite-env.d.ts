/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_MAP_TILE_URL?: string;
  readonly VITE_MAP_TILE_ATTRIBUTION?: string;
  readonly VITE_MAP_TILE_DARKEN?: string;
  readonly VITE_MAP_TILE_CACHE?: string;
  readonly VITE_MOCK_SYNC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
