/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.css';

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_GITHUB_OAUTH_CLIENT_ID?: string;
    readonly VITE_IDP_CLIENT_ID?: string;
    readonly VITE_IDP_AUTHORIZE_URL?: string;
  }

  interface Window {
    __designSystemRemountHeader?: () => void | Promise<void>;
  }
}
