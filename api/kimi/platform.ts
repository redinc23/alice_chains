export interface PlatformConfig {
  authUrl: string;
  appId: string;
  appSecret: string;
  apiBase: string;
}

export function getPlatformConfig(): PlatformConfig {
  return {
    authUrl: process.env.VITE_KIMI_AUTH_URL || "",
    appId: process.env.VITE_APP_ID || "",
    appSecret: process.env.APP_SECRET || "",
    apiBase: process.env.API_BASE || "",
  };
}
