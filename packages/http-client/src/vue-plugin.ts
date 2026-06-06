import type { App, InjectionKey } from "vue";
import { HttpClient } from "./HttpClient";
import { createHttpClient } from "./index";
import { URL_KEY } from "./constants";

export interface HttpPluginOptions {
  baseURL?: string;
  timeout?: number;
  device?: string;
  auth?: boolean | (() => string | null);
  refresh?: boolean;
  tokenMode?: "localStorage" | "cookie" | "memory";
  loginEndpoint?: string;
  refreshEndpoint?: string;
  onReLogin?: () => void;
  loginPageUrl?: string;
  axiosConfig?: Record<string, unknown>;
}

export function createHttpPlugin(options: HttpPluginOptions = {}) {
  const $url = createHttpClient(options);

  return {
    $url,
    install(app: App) {
      app.config.globalProperties.$url = $url;
      app.provide(URL_KEY, $url);
    },
  };
}

export { URL_KEY };
