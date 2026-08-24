import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AUTH_URL } from "@/constants/backend";
import { saveToken } from "@/utils/auth";
import { fetchWithTimeout } from "@/utils/http";

type Mode = "login" | "register";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode]             = useState<Mode>("login");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [name, setName]             = useState("");
  const [loading, setLoading]       = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6,   duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      doShake(); Alert.alert("Ruk", "Email aur password dono chahiye."); return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      doShake(); Alert.alert("Invalid", "Sahi email daal."); return false;
    }
    if (password.length < 6) {
      doShake(); Alert.alert("Weak", "Password kam se kam 6 characters."); return false;
    }
    if (mode === "register" && !name.trim()) {
      doShake(); Alert.alert("Naam?", "Apna naam bhi daal."); return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    const url  = mode === "login" ? `${AUTH_URL}/login` : `${AUTH_URL}/register`;
    const body = mode === "login"
      ? { email: email.trim().toLowerCase(), password }
      : { name: name.trim(), email: email.trim().toLowerCase(), password };
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        doShake();
        Alert.alert("Error", data.message || "Kuch gadbad.");
        return;
      }
      if (!data.token) {
        doShake();
        Alert.alert("Error", "Server ne token nahi diya.");
        return;
      }
      await saveToken(data.token, data.user);
      router.replace("/(tabs)");
    } catch (err) {
      doShake();
      const hint = __DEV__
        ? `\n\nURL: ${url}\n\n1) IntelliJ mein backend Run karo (port 8080)\n2) Phone ho to Expo LAN use karo: npx expo start --lan\n3) Mac firewall allow karo`
        : "";
      console.warn("[auth] request failed:", url, err);
      Alert.alert("Network Error", `Server se connect nahi hua.${hint}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brand}>
          <Text style={s.brandIcon}>🕳️</Text>
          <Text style={s.brandName}>PotholeScan</Text>
          <Text style={s.brandTag}>Smart Road Safety</Text>
        </View>

        <View style={s.tabRow}>
          {(["login", "register"] as Mode[]).map(m => (
            <TouchableOpacity key={m} style={[s.tab, mode === m && s.tabActive]} onPress={() => setMode(m)}>
              <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                {m === "login" ? "Login" : "Register"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Animated.View style={[s.form, { transform: [{ translateX: shake }] }]}>
          {mode === "register" && (
            <View style={s.field}>
              <Text style={s.label}>FULL NAME</Text>
              <TextInput style={s.input} placeholder="Tera naam" placeholderTextColor="#333"
                value={name} onChangeText={setName} autoCapitalize="words" />
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>EMAIL</Text>
            <TextInput style={s.input} placeholder="email@example.com" placeholderTextColor="#333"
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={s.field}>
            <Text style={s.label}>PASSWORD</Text>
            <View style={s.passRow}>
              <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="••••••••"
                placeholderTextColor="#333" value={password} onChangeText={setPassword}
                secureTextEntry={!showPass} autoCapitalize="none" />
              <TouchableOpacity style={s.eye} onPress={() => setShowPass(v => !v)}>
                <Text>{showPass ? "🙈" : "👁"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnText}>{mode === "login" ? "Login" : "Create ur Account"}</Text>}
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.foot}>
          {mode === "login" ? "Not having an Account" : "Already Exists"}
          <Text style={s.footLink} onPress={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Welcome to Sethi's App" : "Register with ur sweeet name"}
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#050508" },
  scroll:      { flexGrow: 1, paddingHorizontal: 24 },
  brand:       { alignItems: "center", marginBottom: 36 },
  brandIcon:   { fontSize: 52, marginBottom: 10 },
  brandName:   { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  brandTag:    { color: "#333", fontSize: 13, marginTop: 4, letterSpacing: 1 },
  tabRow:      { flexDirection: "row", backgroundColor: "#0d0d14", borderRadius: 14, padding: 4, marginBottom: 28, borderWidth: 1, borderColor: "#1c1c2e" },
  tab:         { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive:   { backgroundColor: "#00C851" },
  tabText:     { color: "#444", fontSize: 14, fontWeight: "700" },
  tabTextActive:{ color: "#fff" },
  form:        { gap: 16 },
  field:       { gap: 6 },
  label:       { color: "#555", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  input:       { backgroundColor: "#0d0d14", borderWidth: 1, borderColor: "#1c1c2e", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#fff", fontSize: 15, marginBottom: 4 },
  passRow:     { flexDirection: "row", alignItems: "center", backgroundColor: "#0d0d14", borderWidth: 1, borderColor: "#1c1c2e", borderRadius: 12, paddingRight: 12 },
  eye:         { padding: 8 },
  btn:         { backgroundColor: "#00C851", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, shadowColor: "#00C851", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnOff:      { opacity: 0.6 },
  btnText:     { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  foot:        { color: "#333", fontSize: 13, textAlign: "center", marginTop: 28 },
  footLink:    { color: "#00C851", fontWeight: "700" },
});
