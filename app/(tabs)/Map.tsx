import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { POTHOLES_URL } from "@/constants/backend";


const OFFLINE_FILE =
  (FileSystem.documentDirectory ?? "") + "offline_potholes.json";

const DEFAULT_REGION = {
  latitude: 29.3909,
  longitude: 76.9635,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

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
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [filter, setFilter] = useState<"All" | "Light" | "Medium" | "Severe">(
    "All"
  );
  const [serverOnline, setServerOnline] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [locError, setLocError] = useState(false);
  const mapRef = useRef<MapView>(null);

  const hasAnimatedToUser = useRef(false);

  useEffect(() => {
    getLocation();
    fetchPotholes();
  }, []);

  // FIX: Once we get the user's location AND the map is ready,
  // animate to the user's position (only the first time).
  useEffect(() => {
    if (myLocation && mapReady && !hasAnimatedToUser.current) {
      hasAnimatedToUser.current = true;
      mapRef.current?.animateToRegion(
        { ...myLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        800
      );
    }
  }, [myLocation, mapReady]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setMyLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      setLocError(true);
    }
  };

  const fetchPotholes = async () => {
    setLoading(true);

    // FIX: `AbortSignal.timeout` is not available in all React Native/Hermes
    // versions. Use a manual timeout with AbortController instead.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(POTHOLES_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const off = await loadOffline();
      const ids = new Set(
        data.map((p: Pothole) => p.id).filter(Boolean)
      );
      setPotholes([
        ...data,
        ...off.filter((p: Pothole) => !p.id || !ids.has(p.id)),
      ]);
      setServerOnline(true);
    } catch {
      clearTimeout(timeoutId);
      setPotholes(await loadOffline());
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const loadOffline = async (): Promise<Pothole[]> => {
    try {
      const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
      if (fi.exists)
        return JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
    } catch {}
    return [];
  };

  const centerOnUser = () => {
    if (myLocation && mapRef.current)
      mapRef.current.animateToRegion(
        { ...myLocation, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        600
      );
  };

  const color = (sev: string) =>
    sev?.includes("Light")
      ? "#00C851"
      : sev?.includes("Medium")
      ? "#FFD700"
      : "#FF4444";

  const radius = (sev: string) =>
    sev?.includes("Light") ? 10 : sev?.includes("Medium") ? 16 : 24;

  const filtered =
    filter === "All"
      ? potholes
      : potholes.filter((p) => p.severity?.includes(filter));

  const severe = potholes.filter((p) =>
    p.severity?.includes("Severe")
  ).length;
  const medium = potholes.filter((p) =>
    p.severity?.includes("Medium")
  ).length;
  const light = potholes.filter((p) => p.severity?.includes("Light")).length;

  return (
    <View style={s.container}>
      <View
        style={[s.header, { paddingTop: insets.top + 12 }]}
        onLayout={(e: LayoutChangeEvent) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) setHeaderHeight(h);
        }}
      >
        <View style={s.titleRow}>
          <Text style={s.title}>Pothole Map</Text>
          <View
            style={[
              s.pill,
              { backgroundColor: serverOnline ? "#071a07" : "#1a0f00" },
            ]}
          >
            <View
              style={[
                s.dot,
                { backgroundColor: serverOnline ? "#00C851" : "#FF9500" },
              ]}
            />
            <Text style={s.pillText}>
              {loading ? "Syncing…" : serverOnline ? "Live" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={s.stats}>
          {(
            [
              ["Severe", "#FF4444", severe],
              ["Medium", "#FFD700", medium],
              ["Light", "#00C851", light],
              ["Total", "#fff", potholes.length],
            ] as [string, string, number][]
          ).map(([label, col, val], i, arr) => (
            <React.Fragment key={label}>
              <View style={s.statItem}>
                <Text style={[s.statNum, { color: col }]}>{val}</Text>
                <Text style={s.statLbl}>{label}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.statDiv} />}
            </React.Fragment>
          ))}
        </View>

        <View style={s.filters}>
          {(["All", "Light", "Medium", "Severe"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                {f === "All"
                  ? "All"
                  : f === "Light"
                  ? "🟢 Light"
                  : f === "Medium"
                  ? "🟡 Medium"
                  : "🔴 Severe"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={[s.map, { marginTop: headerHeight }]}
        showsUserLocation={!locError}
        showsMyLocationButton={false}
        rotateEnabled={false}
        moveOnMarkerPress={false}
        // FIX: `initialRegion` only affects first render. We animate to
        // user location via the useEffect above once both are ready.
        initialRegion={DEFAULT_REGION}
        onMapReady={() => setMapReady(true)}
      >
        {mapReady &&
          filtered.flatMap((p, i) => {
            if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng))
              return [];
            const key = p.id ?? `off-${i}`;
            return [
              <Circle
                key={`${key}-c`}
                center={{ latitude: p.lat, longitude: p.lng }}
                radius={radius(p.severity)}
                fillColor={color(p.severity) + "33"}
                strokeColor={color(p.severity) + "88"}
                strokeWidth={1}
              />,
              <Marker
                key={`${key}-m`}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                pinColor={color(p.severity)}
                tracksViewChanges={false} // prevents OOM crash on many markers
              >
                <Callout tooltip={false}>
                  <View style={s.callout}>
                    <Text style={s.calloutTitle}>
                      Pothole #{p.id ?? `Offline ${i + 1}`}
                    </Text>
                    <Text style={[s.calloutSev, { color: color(p.severity) }]}>
                      {p.severity}
                    </Text>
                    <Text style={s.calloutDetail}>
                      Speed: {p.speed?.toFixed(1)} km/h
                    </Text>
                    <Text style={s.calloutDetail}>
                      Impact: {p.accelZ?.toFixed(2)}g
                    </Text>
                  </View>
                </Callout>
              </Marker>,
            ];
          })}
      </MapView>

      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="small" color="#00C851" />
          <Text style={s.loadingText}>Fetching potholes…</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.fab, s.fabUp]}
        onPress={centerOnUser}
        disabled={locError}
      >
        <Text style={[s.fabText, locError && { opacity: 0.3 }]}>◎</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.fab} onPress={fetchPotholes}>
        <Text style={s.fabText}>↻</Text>
      </TouchableOpacity>

      {filtered.length === 0 && !loading && (
        <View style={s.empty}>
          <Text style={s.emptyText}>
            No {filter === "All" ? "" : filter} potholes found
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050508" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "lightblue",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { color: "#aaa", fontSize: 12, fontWeight: "600" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "lightblue",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLbl: {
    color: "#444",
    fontSize: 10,
    marginTop: 2,
    textTransform: "uppercase",
  },
  statDiv: { width: 1, height: 30, backgroundColor: "lightblue" },
  filters: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#0d0d14",
    borderWidth: 1,
    borderColor: "#1c1c2e",
  },
  chipActive: { backgroundColor: "#1c1c2e", borderColor: "#444" },
  chipText: { color: "#444", fontSize: 11, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  map: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(5,5,8,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 5,
  },
  loadingText: { color: "#00C851", fontSize: 12, fontWeight: "600" },
  callout: {
    minWidth: 160,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  calloutSev: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  calloutDetail: { fontSize: 11, color: "#555" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0d0d14",
    borderWidth: 1,
    borderColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabUp: { bottom: 94 },
  fabText: { color: "#fff", fontSize: 22 },
  empty: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(5,5,8,0.9)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyText: { color: "#555", fontSize: 13 },
});
