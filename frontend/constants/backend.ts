import Constants from "expo-constants";
import { Platform } from "react-native";

declare const __DEV__: boolean;

function getDevHost(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost ??
    (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | undefined)
      ?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  if (Platform.OS === "android") return "10.0.2.2";
  return "127.0.0.1";
}

const DEV_HOST = getDevHost();
const LOCAL_BASE = `http://${DEV_HOST}:8080/api`;
const REMOTE_BASE = "https://pothole-backend-2.onrender.com/api";

const BASE = __DEV__ ? LOCAL_BASE : REMOTE_BASE;

export const API_BASE = BASE;
export const POTHOLES_URL = `${BASE}/potholes`;
export const DETECT_URL = `${BASE}/${__DEV__ ? "potholes" : "detect-pothole"}`;
export const AUTH_URL = `${BASE}/auth`;

if (__DEV__) {
  console.log("[API] Using base URL:", BASE);
}
