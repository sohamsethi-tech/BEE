import { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, LayoutChangeEvent
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import * as Location from "expo-location";
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
  savedAt?: string;
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();

  const [potholes, setPotholes]         = useState<Pothole[]>([]);
  const [myLocation, setMyLocation]     = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<"All" | "Light" | "Medium" | "Severe">("All");
  const [serverOnline, setServerOnline] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0); // dynamic — measured at runtime

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    getLocation();
    fetchPotholes();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    setMyLocation(loc.coords);
  };

  // ── Deduplicate: prefer server records; include offline only if not synced ──
  const deduplicatePotholes = (serverData: Pothole[], offlineData: Pothole[]): Pothole[] => {
    const serverIds = new Set(serverData.map(p => p.id).filter(Boolean));
    const uniqueOffline = offlineData.filter(p => !p.id || !serverIds.has(p.id));
    return [...serverData, ...uniqueOffline];
  };

  const fetchPotholes = async () => {
    setLoading(true);
    try {
      const res     = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(6000) });
      const data    = await res.json();
      const offline = await loadOfflineData();
      setPotholes(deduplicatePotholes(data, offline));
      setServerOnline(true);
    } catch {
      const offline = await loadOfflineData();
      setPotholes(offline);
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

  const centerOnUser = () => {
    if (myLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude:      myLocation.latitude,
        longitude:     myLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 600);
    }
  };

  const getMarkerColor = (sev: string) => {
    if (sev?.includes("Light"))  return "#00C851";
    if (sev?.includes("Medium")) return "#FFD700";
    return "#FF4444";
  };

  const getCircleRadius = (sev: string) => {
    if (sev?.includes("Light"))  return 10;
    if (sev?.includes("Medium")) return 16;
    return 24;
  };

  const filtered = filter === "All"
    ? potholes
    : potholes.filter(p => p.severity?.includes(filter));

  const severe = potholes.filter(p => p.severity?.includes("Severe")).length;
  const medium = potholes.filter(p => p.severity?.includes("Medium")).length;
  const light  = potholes.filter(p => p.severity?.includes("Light")).length;

  // Measure header height dynamically so the map fills remaining space exactly
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#00C851" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Overlay Header — measured dynamically */}
      <View
        style={[styles.overlayHeader, { paddingTop: insets.top + 12 }]}
        onLayout={onHeaderLayout}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Pothole Map</Text>
          <View style={[styles.onlinePill, { backgroundColor: serverOnline ? "#071a07" : "#1a0f00" }]}>
            <View style={[styles.onlineDot, { backgroundColor: serverOnline ? "#00C851" : "#FF9500" }]} />
            <Text style={styles.onlinePillText}>{serverOnline ? "Live" : "Offline"}</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#FF4444" }]}>{severe}</Text>
            <Text style={styles.statLbl}>Severe</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#FFD700" }]}>{medium}</Text>
            <Text style={styles.statLbl}>Medium</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#00C851" }]}>{light}</Text>
            <Text style={styles.statLbl}>Light</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#fff" }]}>{potholes.length}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(["All", "Light", "Medium", "Severe"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f === "All" ? "All" : f === "Light" ? "🟢 Light" : f === "Medium" ? "🟡 Medium" : "🔴 Severe"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Map — marginTop set to measured header height so nothing is clipped */}
      {headerHeight > 0 && (
        <MapView
          ref={mapRef}
          style={[styles.map, { marginTop: headerHeight }]}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard"
          initialRegion={
            myLocation
              ? { latitude: myLocation.latitude, longitude: myLocation.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
              : { latitude: 29.3909, longitude: 76.9635, latitudeDelta: 0.1, longitudeDelta: 0.1 } // Panipat default
          }
        >
          {filtered.map((p, i) => (
            // React.Fragment allows Circle + Marker as siblings without a View wrapper
            // (MapView does not accept View children — only map-specific components)
            <React.Fragment key={p.id ?? `offline-${i}`}>
              <Circle
                center={{ latitude: p.lat, longitude: p.lng }}
                radius={getCircleRadius(p.severity)}
                fillColor={getMarkerColor(p.severity) + "33"}
                strokeColor={getMarkerColor(p.severity) + "88"}
                strokeWidth={1}
              />
              <Marker
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                pinColor={getMarkerColor(p.severity)}
                tracksViewChanges={false}
              >
                <Callout tooltip={false}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>
                      Pothole #{p.id ?? `Offline ${i + 1}`}
                    </Text>
                    <Text style={[styles.calloutSev, { color: getMarkerColor(p.severity) }]}>
                      {p.severity}
                    </Text>
                    <Text style={styles.calloutDetail}>Speed: {p.speed?.toFixed(1)} km/h</Text>
                    <Text style={styles.calloutDetail}>Impact: {p.accelZ?.toFixed(2)}g</Text>
                  </View>
                </Callout>
              </Marker>
            </React.Fragment>
          ))}
        </MapView>
      )}

      {/* Center on user FAB */}
      <TouchableOpacity style={[styles.fab, styles.fabCenter]} onPress={centerOnUser}>
        <Text style={styles.fabText}>◎</Text>
      </TouchableOpacity>

      {/* Refresh FAB */}
      <TouchableOpacity style={styles.fab} onPress={fetchPotholes}>
        <Text style={styles.fabText}>↻</Text>
      </TouchableOpacity>

      {/* Empty state overlay */}
      {filtered.length === 0 && !loading && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>
            No {filter === "All" ? "" : filter} potholes found
          </Text>
        </View>
      )}
    </View>
  );
}

// Need React for React.Fragment
import React from "react";

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#050508" },
  loadingScreen:   { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050508" },
  loadingText:     { color: "#555", marginTop: 12, fontSize: 14 },
  overlayHeader:   {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: "rgba(5,5,8,0.96)",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#111",
  },
  titleRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title:           { fontSize: 24, fontWeight: "800", color: "#fff" },
  onlinePill:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  onlineDot:       { width: 7, height: 7, borderRadius: 4 },
  onlinePillText:  { color: "#aaa", fontSize: 12, fontWeight: "600" },
  statsStrip:      { flexDirection: "row", alignItems: "center", backgroundColor: "#0d0d14", borderRadius: 12, paddingVertical: 10, marginBottom: 10 },
  statItem:        { flex: 1, alignItems: "center" },
  statNum:         { fontSize: 18, fontWeight: "800" },
  statLbl:         { color: "#444", fontSize: 10, marginTop: 2, textTransform: "uppercase" },
  statDivider:     { width: 1, height: 30, backgroundColor: "#1a1a1a" },
  filterRow:       { flexDirection: "row", gap: 8 },
  filterChip:      { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: "center", backgroundColor: "#0d0d14", borderWidth: 1, borderColor: "#1c1c2e" },
  filterChipActive:     { backgroundColor: "#1c1c2e", borderColor: "#444" },
  filterChipText:       { color: "#444", fontSize: 11, fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  map:             { flex: 1 },
  callout:         { minWidth: 160, padding: 8, backgroundColor: "#fff", borderRadius: 8 },
  calloutTitle:    { fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 4 },
  calloutSev:      { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  calloutDetail:   { fontSize: 11, color: "#555" },
  fab:             { position: "absolute", bottom: 30, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: "#0d0d14", borderWidth: 1, borderColor: "#222", justifyContent: "center", alignItems: "center", elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
  fabCenter:       { bottom: 94, right: 20 },
  fabText:         { color: "#fff", fontSize: 22 },
  emptyOverlay:    { position: "absolute", bottom: 100, alignSelf: "center", backgroundColor: "rgba(5,5,8,0.9)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyText:       { color: "#555", fontSize: 13 },
});
