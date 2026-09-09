import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Alert, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import { POTHOLES_URL } from "@/constants/backend";
import { authHeaders, getUser, type AuthUser } from "@/utils/auth";

const OFFLINE_FILE = (FileSystem.documentDirectory ?? "") + "offline_potholes.json";

type Pothole = {
  id: number; lat: number; lng: number; severity: string;
  speed: number; accelZ: number; detectedAt: string;
  photoUri?: string; savedAt?: string;
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [potholes, setPotholes]         = useState<Pothole[]>([]);
  const [loading, setLoading]           = useState(true);
  const [serverOnline, setServerOnline] = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);

  useEffect(() => {
    fetchData();
    getUser().then((u: AuthUser | null) => setIsAdmin(u?.role === "ADMIN"));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(POTHOLES_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const serverData = await res.json();
      const offline    = await loadOffline();
      const ids        = new Set(serverData.map((p: Pothole) => p.id).filter(Boolean));
      const combined   = [
        ...serverData,
        ...offline.filter((p: Pothole) => !p.id || !ids.has(p.id)),
      ].sort((a, b) =>
        new Date(b.detectedAt || b.savedAt || 0).getTime() -
        new Date(a.detectedAt || a.savedAt || 0).getTime()
      );
      setPotholes(combined);
      setServerOnline(true);
    } catch {
      clearTimeout(timeoutId);
      setPotholes([...(await loadOffline())].reverse());
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const loadOffline = async (): Promise<Pothole[]> => {
    try {
      const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
      if (fi.exists) return JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
    } catch {}
    return [];
  };

  // ── Delete — only ADMIN can delete from server ─────────────────────────
  const deletePothole = (item: Pothole) => {
    if (!isAdmin && item.id) {
      Alert.alert("Permission Denied", "Sirf admin server records delete kar sakta hai.");
      return;
    }
    Alert.alert("Delete Record", "Remove this pothole entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (item.id) {
            try {
              const headers = await authHeaders();
              await fetch(`${POTHOLES_URL}/${item.id}`, { method: "DELETE", headers });
            } catch {}
          }
          setPotholes(p => p.filter(x => x.id ? x.id !== item.id : x.savedAt !== item.savedAt));
          try {
            const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
            if (fi.exists) {
              const data = JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
              await FileSystem.writeAsStringAsync(OFFLINE_FILE,
                JSON.stringify(data.filter((x: Pothole) => x.savedAt !== item.savedAt)));
            }
          } catch {}
        },
      },
    ]);
  };

  const openMap = (lat: number, lng: number) =>
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)
      .catch(() => Alert.alert("Error", "Maps app open nahi hua."));

  const formatDate = (str: string) => {
    if (!str) return "Unknown";
    const d = new Date(str);
    return isNaN(d.getTime()) ? str
      : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const cfg = (sev: string) => {
    if (sev?.includes("Light"))  return { bg: "#071a07", border: "#1a3a1a", text: "#00C851",  label: "LIGHT"  };
    if (sev?.includes("Medium")) return { bg: "#1a1500", border: "#3a3000", text: "#FFD700",  label: "MEDIUM" };
    return                              { bg: "#1a0505", border: "#3a1010", text: "#FF4444",  label: "SEVERE" };
  };

  const severe = potholes.filter(p => p.severity?.includes("Severe")).length;
  const medium = potholes.filter(p => p.severity?.includes("Medium")).length;
  const light  = potholes.filter(p => p.severity?.includes("Light")).length;

  const renderItem = ({ item, index }: { item: Pothole; index: number }) => {
    const c = cfg(item.severity || "");
    return (
      <View style={[s.card, { backgroundColor: c.bg, borderColor: c.border }]}>
        {item.photoUri && <Image source={{ uri: item.photoUri }} style={s.photo} resizeMode="cover" />}
        <View style={s.body}>
          <View style={s.top}>
            <View style={s.idRow}>
              <Text style={s.num}>#{item.id || `O${index + 1}`}</Text>
              <View style={[s.badge, { backgroundColor: c.text + "22", borderColor: c.text + "55" }]}>
                <Text style={[s.badgeText, { color: c.text }]}>{c.label}</Text>
              </View>
            </View>
            <Text style={s.date}>{formatDate(item.detectedAt || item.savedAt || "")}</Text>
          </View>
          <View style={s.dataRow}>
            <View style={s.dataItem}>
              <Text style={s.dataLabel}>LOCATION</Text>
              <Text style={s.dataVal} numberOfLines={1}>{item.lat?.toFixed(4) ?? "—"}, {item.lng?.toFixed(4) ?? "—"}</Text>
            </View>
            <View style={s.dataItem}>
              <Text style={s.dataLabel}>SPEED</Text>
              <Text style={s.dataVal}>{item.speed?.toFixed(1) ?? "—"} km/h</Text>
            </View>
            <View style={s.dataItem}>
              <Text style={s.dataLabel}>IMPACT</Text>
              <Text style={s.dataVal}>{item.accelZ?.toFixed(2) ?? "—"}g</Text>
            </View>
          </View>
          <View style={s.actions}>
            <TouchableOpacity style={[s.mapBtn, { borderColor: c.text + "44" }]} onPress={() => openMap(item.lat, item.lng)}>
              <Text style={[s.mapBtnText, { color: c.text }]}>🗺  View on Map</Text>
            </TouchableOpacity>
            {/* Show delete only to admins for server records, anyone for offline */}
            {(isAdmin || !item.id) && (
              <TouchableOpacity style={s.delBtn} onPress={() => deletePothole(item)}>
                <Text style={s.delText}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={s.loading}>
      <ActivityIndicator size="large" color="#00C851" />
      <Text style={s.loadingText}>Loading records...</Text>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top + 16 }]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Records</Text>
          <Text style={s.sub}>{serverOnline ? "🟢 Server connected" : "🟡 Offline mode"}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchData}>
          <Text style={s.refreshText}>↻  Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={s.chips}>
        {[["#071a07","#1a3a1a","#00C851","Light",light],["#1a1500","#3a3000","#FFD700","Medium",medium],["#1a0505","#3a1010","#FF4444","Severe",severe],["#0d0d14","#1c1c2e","#fff","Total",potholes.length]].map(([bg,border,col,label,val]) => (
          <View key={label as string} style={[s.chip, { backgroundColor: bg as string, borderColor: border as string }]}>
            <Text style={[s.chipNum, { color: col as string }]}>{val as number}</Text>
            <Text style={s.chipLabel}>{label as string}</Text>
          </View>
        ))}
      </View>

      {potholes.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🛣</Text>
          <Text style={s.emptyTitle}>No potholes yet</Text>
          <Text style={s.emptyHint}>Start driving to detect potholes!</Text>
        </View>
      ) : (
        <FlatList
          data={potholes}
          keyExtractor={(item, i) => item.id?.toString() || item.savedAt || String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#050508", paddingHorizontal: 16 },
  loading:     { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050508" },
  loadingText: { color: "#555", marginTop: 12, fontSize: 14 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  title:       { fontSize: 26, fontWeight: "800", color: "#fff" },
  sub:         { fontSize: 12, color: "#444", marginTop: 3 },
  refreshBtn:  { backgroundColor: "#0d0d14", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#1c1c2e" },
  refreshText: { color: "#aaa", fontSize: 13, fontWeight: "600" },
  chips:       { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 18 },
  chip:        { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  chipNum:     { fontSize: 20, fontWeight: "800" },
  chipLabel:   { color: "#555", fontSize: 10, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  card:        { borderRadius: 16, marginBottom: 14, overflow: "hidden", borderWidth: 1 },
  photo:       { width: "100%", height: 190 },
  body:        { padding: 14 },
  top:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  idRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  num:         { color: "#777", fontSize: 13, fontWeight: "700" },
  badge:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText:   { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  date:        { color: "#444", fontSize: 11 },
  dataRow:     { flexDirection: "row", marginBottom: 12 },
  dataItem:    { flex: 1 },
  dataLabel:   { color: "#333", fontSize: 9, letterSpacing: 1, fontWeight: "700", textTransform: "uppercase" },
  dataVal:     { color: "#aaa", fontSize: 12, marginTop: 3, fontWeight: "600" },
  actions:     { flexDirection: "row", gap: 8 },
  mapBtn:      { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  mapBtnText:  { fontSize: 13, fontWeight: "700" },
  delBtn:      { backgroundColor: "#1a0505", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#3a1010" },
  delText:     { fontSize: 16 },
  empty:       { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  emptyIcon:   { fontSize: 60, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, color: "#555", fontWeight: "700", marginBottom: 8 },
  emptyHint:   { fontSize: 14, color: "#333" },
});
