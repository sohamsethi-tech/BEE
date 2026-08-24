import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthUser, clearAuth, getUser } from "@/utils/auth";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const logout = () => {
    Alert.alert("Logout", "Account se logout karna hai?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearAuth();
          router.replace("/auth" as const);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#00C851" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 24 }]}>
      <Text style={s.title}>Profile</Text>

      <View style={s.card}>
        <Text style={s.label}>NAME</Text>
        <Text style={s.value}>{user?.name || "—"}</Text>

        <Text style={[s.label, s.gap]}>EMAIL</Text>
        <Text style={s.value}>{user?.email || "—"}</Text>

        <Text style={[s.label, s.gap]}>ROLE</Text>
        <Text style={s.value}>{user?.role || "USER"}</Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050508", paddingHorizontal: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050508",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 20 },
  card: {
    backgroundColor: "#0d0d14",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1c1c2e",
  },
  label: {
    color: "#555",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  gap: { marginTop: 14 },
  value: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 6 },
  logoutBtn: {
    marginTop: 28,
    backgroundColor: "#1a0505",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3a1010",
  },
  logoutText: { color: "#FF4444", fontSize: 16, fontWeight: "800" },
});
