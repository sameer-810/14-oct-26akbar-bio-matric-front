/**
 * EXPO_PUBLIC_* values are inlined at export time, so they must be set in the
 * build environment (eas.json per profile, the web host's env for web).
 * Nothing secret belongs here: everything in this file ships inside the app.
 *
 * There is deliberately no production fallback URL. A build without the
 * variable should fail loudly at the first request, not quietly talk to an
 * emulator address the way the old parent app did.
 */

import { apiBase } from "./apiBase";

const DEV_API = apiBase(process.env.EXPO_PUBLIC_API_URL_DEV || "http://localhost:5010/api/v1");
const PROD_API = apiBase(process.env.EXPO_PUBLIC_API_URL || "");

export const environment = {
  apiUrl: __DEV__ ? DEV_API : PROD_API,
  isDev: __DEV__,
  appName: "Akbars Academy",
} as const;
