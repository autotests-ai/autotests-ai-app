/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.css';

export {};

declare global {
  interface Window {
    __designSystemRemountHeader?: () => void | Promise<void>;
  }
}
