import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

export const saveToken = async (
  token: string,
  user?: AuthUser | null
): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.error("[auth] saveToken failed:", error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("[auth] getToken failed:", error);
    return null;
  }
};

export const getUser = async (): Promise<AuthUser | null> => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch (error) {
    console.error("[auth] getUser failed:", error);
    return null;
  }
};

export const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const clearAuth = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.error("[auth] clearAuth failed:", error);
  }
};

export const removeToken = clearAuth;
