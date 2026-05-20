import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Alert, Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import { POTHOLES_URL } from "../constants/backend";

const BACKEND_URL  = POTHOLES_URL;
const OFFLINE_FILE = (FileSystem.documentDirectory ?? "") + "offline_potholes.json";

type Pothole = {
  id: number;
  lat: number;
  lng: number;
  severity: string;
  speed: number;
  accelZ: number;
  detectedAt: string;
  photoUri?: string;
  savedAt?: string;
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  const [potholes, setPotholes]         = useState<Pothole[]>([]);
  const [loading, setLoading]           = useState(true);
  const [serverOnline, setServerOnline] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res        = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(6000) });
      const serverData = await res.json();
      const offline    = await loadOfflineData();

      // Deduplicate: offline items that already exist on server (by id) are dropped
      const serverIds      = new Set(serverData.map((p: Pothole) => p.id).filter(Boolean));
      const uniqueOffline  = offline.filter((p: Pothole) => !p.id || !serverIds.has(p.id));
      const combined       = [...serverData, ...uniqueOffline].sort((a, b) =>
        new Date(b.detectedAt || b.savedAt || 0).getTime() -
        new Date(a.detectedAt || a.savedAt || 0).getTime()
      );
      setPotholes(combined);
      setServerOnline(true);
    } catch {
      const offline = await loadOfflineData();
      setPotholes([...offline].reverse());
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineData = async (): Promise<Pothole[]> => {
    try {
      const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
      if (fi.exists) return JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
    } catch {}
    return [];
  };

  const deletePothole = (item: Pothole) => {
    Alert.alert("Delete Record", "Remove this pothole entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (item.id) {
            try { await fetch(`${BACKEND_URL}/${item.id}`, { method: "DELETE" }); } catch {}
          }
          // Remove from state
          setPotholes(p => p.filter(x => (x.id ? x.id !== item.id : x.savedAt !== item.savedAt)));
          // Remove from offline file if it was offline
          try {
            const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
            if (fi.exists) {
              const data = JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
              const upd  = data.filter((x: Pothole) => x.savedAt !== item.savedAt);
              await FileSystem.writeAsStringAsync(OFFLINE_FILE, JSON.stringify(upd));
            }
          } catch {}
        }
      }
    ]);
  };

  const openMap = (lat: number, lng: number) => {
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open maps app."));
  };

  const formatDate = (str: string) => {
    if (!str) return "Unknown";
    const d = new Date(str);
    return isNaN(d.getTime())
      ? str
      : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getSeverityConfig = (sev: string) => {
    if (sev?.includes("Light"))  return { bg: "#071a07", border: "#1a3a1a", text: "#00C851",  label: "LIGHT"  };
    if (sev?.includes("Medium")) return { bg: "#1a1500", border: "#3a3000", text: "#FFD700",  label: "MEDIUM" };
    return                              { bg: "#1a0505", border: "#3a1010", text: "#FF4444",  label: "SEVERE" };
  };

  // ── Summary Stats ──────────────────────────────────────────────────────────
  const severe = potholes.filter(p => p.severity?.includes("Severe")).length;
  const medium = potholes.filter(p => p.severity?.includes("Medium")).length;
  const light  = potholes.filter(p => p.severity?.includes("Light")).length;

  const renderItem = ({ item, index }: { item: Pothole; index: number }) => {
    const cfg = getSeverityConfig(item.severity || "");
    return (
      <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        {item.photoUri && (
          <Image source={{ uri: item.photoUri }} style={styles.photo} resizeMode="cover" />
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.cardIdRow}>
              <Text style={styles.cardNum}>#{item.id || `O${index + 1}`}</Text>
              <View style={[styles.severityBadge, { backgroundColor: cfg.text + "22", borderColor: cfg.text + "55" }]}>
                <Text style={[styles.severityBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
              </View>
            </View>
            <Text style={styles.cardDate}>{formatDate(item.detectedAt || item.savedAt || "")}</Text>
          </View>

          <View style={styles.dataRow}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>LOCATION</Text>
              <Text style={styles.dataValue} numberOfLines={1}>
                {item.lat?.toFixed(4) ?? "—"}, {item.lng?.toFixed(4) ?? "—"}
              </Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>SPEED</Text>
              <Text style={styles.dataValue}>{item.speed?.toFixed(1) ?? "—"} km/h</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>IMPACT</Text>
              <Text style={styles.dataValue}>{item.accelZ?.toFixed(2) ?? "—"}g</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.mapBtn, { borderColor: cfg.text + "44" }]}
              onPress={() => openMap(item.lat, item.lng)}
            >
              <Text style={[styles.mapBtnText, { color: cfg.text }]}>🗺  View on Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePothole(item)}>
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#00C851" />
        <Text style={styles.loadingText}>Loading records...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Records</Text>
          <Text style={styles.subtitle}>
            {serverOnline ? "🟢 Server connected" : "🟡 Offline mode"}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
          <Text style={styles.refreshText}>↻  Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Summary chips */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryChip, { backgroundColor: "#071a07", borderColor: "#1a3a1a" }]}>
          <Text style={[styles.summaryNum, { color: "#00C851" }]}>{light}</Text>
          <Text style={styles.summaryLabel}>Light</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: "#1a1500", borderColor: "#3a3000" }]}>
          <Text style={[styles.summaryNum, { color: "#FFD700" }]}>{medium}</Text>
          <Text style={styles.summaryLabel}>Medium</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: "#1a0505", borderColor: "#3a1010" }]}>
          <Text style={[styles.summaryNum, { color: "#FF4444" }]}>{severe}</Text>
          <Text style={styles.summaryLabel}>Severe</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: "#0d0d14", borderColor: "#1c1c2e" }]}>
          <Text style={[styles.summaryNum, { color: "#fff" }]}>{potholes.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {potholes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛣</Text>
          <Text style={styles.emptyTitle}>No potholes yet</Text>
          <Text style={styles.emptyHint}>Start driving to detect potholes!</Text>
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

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#050508", paddingHorizontal: 16 },
  loading:           { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050508" },
  loadingText:       { color: "#555", marginTop: 12, fontSize: 14 },
  header:            { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  title:             { fontSize: 26, fontWeight: "800", color: "#fff" },
  subtitle:          { fontSize: 12, color: "#444", marginTop: 3 },
  refreshBtn:        { backgroundColor: "#0d0d14", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#1c1c2e" },
  refreshText:       { color: "#aaa", fontSize: 13, fontWeight: "600" },
  summaryRow:        { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 18 },
  summaryChip:       { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  summaryNum:        { fontSize: 20, fontWeight: "800" },
  summaryLabel:      { color: "#555", fontSize: 10, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  card:              { borderRadius: 16, marginBottom: 14, overflow: "hidden", borderWidth: 1 },
  photo:             { width: "100%", height: 190 },
  cardBody:          { padding: 14 },
  cardTop:           { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardIdRow:         { flexDirection: "row", alignItems: "center", gap: 8 },
  cardNum:           { color: "#777", fontSize: 13, fontWeight: "700" },
  severityBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  severityBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  cardDate:          { color: "#444", fontSize: 11 },
  dataRow:           { flexDirection: "row", marginBottom: 12 },
  dataItem:          { flex: 1 },
  dataLabel:         { color: "#333", fontSize: 9, letterSpacing: 1, fontWeight: "700", textTransform: "uppercase" },
  dataValue:         { color: "#aaa", fontSize: 12, marginTop: 3, fontWeight: "600" },
  actions:           { flexDirection: "row", gap: 8 },
  mapBtn:            { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  mapBtnText:        { fontSize: 13, fontWeight: "700" },
  deleteBtn:         { backgroundColor: "#1a0505", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#3a1010" },
  deleteBtnText:     { fontSize: 16 },
  empty:             { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  emptyIcon:         { fontSize: 60, marginBottom: 16 },
  emptyTitle:        { fontSize: 20, color: "#555", fontWeight: "700", marginBottom: 8 },
  emptyHint:         { fontSize: 14, color: "#333" },
});
