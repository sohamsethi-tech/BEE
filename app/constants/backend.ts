import { Platform } from "react-native";

const LOCAL_BACKEND_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const LOCAL_BACKEND_PORT = 8080;
const LOCAL_BACKEND_BASE_URL = `http://${LOCAL_BACKEND_HOST}:${LOCAL_BACKEND_PORT}/api`;
const REMOTE_BACKEND_BASE_URL = "https://pothole-backend-2.onrender.com/api";

// Use local backend during development, remote deployed backend in production builds.
const BACKEND_BASE_URL = __DEV__ ? LOCAL_BACKEND_BASE_URL : REMOTE_BACKEND_BASE_URL;
const DETECT_PATH = __DEV__ ? "/potholes" : "/detect-pothole";

export const DETECT_URL = `${BACKEND_BASE_URL}${DETECT_PATH}`;
export const POTHOLES_URL = `${BACKEND_BASE_URL}/potholes`;

export const LOCAL_BACKEND_NOTE =
  "If running on a physical device, replace localhost with your computer's IP address.";
