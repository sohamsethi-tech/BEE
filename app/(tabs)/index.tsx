import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  Image, Share, ScrollView, Animated, Easing
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Accelerometer } from "expo-sensors";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system/legacy";
import { DETECT_URL } from "../constants/backend";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const BACKEND_URL    = DETECT_URL;
const OFFLINE_FILE   = (FileSystem.documentDirectory ?? "") + "offline_potholes.json";
const COOLDOWN       = 4000;  // ms between detections
const MIN_SPEED      = 5;     // km/h minimum
const SHOCK_THRESH   = 1.0;   // g-force deviation threshold
const MIN_SHOCKS     = 2;     // consecutive shocks needed
const ACCEL_INTERVAL = 100;   // ms polling interval

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  // ── State ────────────────────────────────────────────────────────────────
  const [accel, setAccel]                   = useState({ x: 0, y: 0, z: 0 });
  const [speed, setSpeed]                   = useState(0);
  const [location, setLocation]             = useState<Location.LocationObject | null>(null);
  const [pothole, setPothole]               = useState(false);
  const [severityLabel, setSeverityLabel]   = useState("");
  const [status, setStatus]                 = useState("Ready to detect...");
  const [lastPhoto, setLastPhoto]           = useState<string | null>(null);
  const [totalDetected, setTotalDetected]   = useState(0);
  const [isDetecting, setIsDetecting]       = useState(true);
  const [voiceEnabled, setVoiceEnabled]     = useState(true);
  const [offlineCount, setOfflineCount]     = useState(0);
  const [isOnline, setIsOnline]             = useState(true);
  const [lastDetectionTime, setLastDetectionTime] = useState("");

  // ── Refs ─────────────────────────────────────────────────────────────────
  const lastSentTime    = useRef(0);
  const shockCount      = useRef(0);
  const peakShock       = useRef(0);
  const subscription    = useRef<any>(null);
  const locationRef     = useRef<Location.LocationObject | null>(null);
  const speedRef        = useRef(0);
  const lastLocRef      = useRef<Location.LocationObject | null>(null);
  const isDetectingRef  = useRef(true);
  const offlineCountRef = useRef(0); // ref to avoid stale closure in sendToBackend

  // keep refs in sync with state
  useEffect(() => { isDetectingRef.current = isDetecting; }, [isDetecting]);
  useEffect(() => { offlineCountRef.current = offlineCount; }, [offlineCount]);

  // ── Animations ────────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const alertAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (pothole) {
      Animated.sequence([
        Animated.timing(alertAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          { iterations: 5 }
        ),
      ]).start();
    } else {
      alertAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [pothole]);

  useEffect(() => {
    initApp();
    return () => {
      if (subscription.current) subscription.current.remove();
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initApp = async () => {
    await loadOfflineCount();
    await startSensors();
  };

  const classifySeverity = (shock: number) => {
    if (shock < 1.5) return "🟢 Light";
    if (shock < 2.5) return "🟡 Medium";
    return "🔴 Severe";
  };

  const getSeverityColor = (severity: string) => {
    if (severity.includes("Light"))  return "#00C851";
    if (severity.includes("Medium")) return "#FFD700";
    return "#FF4444";
  };

  const speakAlert = (severity: string) => {
    if (!voiceEnabled) return;
    Speech.stop();
    let msg = "Pothole detected! ";
    if (severity.includes("Light"))       msg += "Light bump ahead.";
    else if (severity.includes("Medium")) msg += "Medium pothole. Drive carefully.";
    else                                  msg += "Severe pothole! Slow down!";
    Speech.speak(msg, { language: "en", pitch: 1.0, rate: 1.1 });
  };

  // Haversine distance in metres
  const getDistance = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R    = 6371000;
    const dLat = (la2 - la1) * Math.PI / 180;
    const dLng = (lo2 - lo1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2 +
      Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getSpeedStatus = () => {
    if (speed === 0)       return { label: "Stopped", color: "#555" };
    if (speed < MIN_SPEED) return { label: "Slow",    color: "#FF9500" };
    if (speed < 25)        return { label: "Active",  color: "#FFD700" };
    return                        { label: "Moving",  color: "#00C851" };
  };

  // ── Sensors ───────────────────────────────────────────────────────────────
  const startSensors = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location access is required for pothole detection.");
      return;
    }

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 1 },
      (loc) => {
        setLocation(loc);
        locationRef.current = loc;

        // ── Speed calculation (GPS + fallback) ──────────────────────────────
        // coords.speed is in m/s; negative means unavailable
        let rawSpeed = (loc.coords.speed ?? -1);

        let kmh = 0;
        if (rawSpeed >= 0) {
          kmh = rawSpeed * 3.6; // m/s → km/h
        } else if (lastLocRef.current) {
          // Fallback: compute from displacement over time
          const timeDiff = (loc.timestamp - lastLocRef.current.timestamp) / 1000; // seconds
          if (timeDiff > 0.1) { // avoid division by near-zero
            const dist    = getDistance(
              lastLocRef.current.coords.latitude,
              lastLocRef.current.coords.longitude,
              loc.coords.latitude,
              loc.coords.longitude
            );
            const computed = (dist / timeDiff) * 3.6;
            kmh = computed < 200 ? computed : 0; // sanity cap at 200 km/h
          }
        }

        // ── Exponential moving average smoothing ─────────────────────────
        // Alpha = 0.3 gives smooth readings; higher = more responsive
        const alpha   = 0.3;
        let smoothed: number;
        if (kmh > 0) {
          smoothed = speedRef.current * (1 - alpha) + kmh * alpha;
        } else {
          // Decay gradually toward 0 when no movement detected
          smoothed = Math.max(0, speedRef.current * 0.85);
        }

        const finalSpeed = smoothed < 0.5 ? 0 : Math.round(smoothed * 10) / 10;
        lastLocRef.current   = loc;
        speedRef.current     = finalSpeed;
        setSpeed(finalSpeed);
      }
    );

    Accelerometer.setUpdateInterval(ACCEL_INTERVAL);
    subscription.current = Accelerometer.addListener((data) => {
      setAccel(data);

      // magnitude of acceleration vector; subtract 1g (gravity) for deviation
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      const shock     = Math.abs(magnitude - 1);
      const now       = Date.now();
      const canDetect = now - lastSentTime.current > COOLDOWN;

      // Use ref for latest detecting state (avoids stale closure)
      if (!isDetectingRef.current || speedRef.current < MIN_SPEED) {
        shockCount.current = 0;
        peakShock.current  = 0;
        return;
      }

      if (shock > SHOCK_THRESH) {
        shockCount.current++;
        peakShock.current = Math.max(peakShock.current, shock);
      } else {
        // Gradual decay — don't reset instantly so we catch burst impacts
        if (shockCount.current > 0) shockCount.current = Math.max(0, shockCount.current - 1);
        if (shockCount.current === 0) peakShock.current = 0;
      }

      if (shockCount.current >= MIN_SHOCKS && canDetect) {
        const detectedShock = peakShock.current;
        const label         = classifySeverity(detectedShock);
        const time          = new Date().toLocaleTimeString();

        setSeverityLabel(label);
        setPothole(true);
        setTotalDetected(p => p + 1);
        setLastDetectionTime(time);
        setStatus(`⚠️ Pothole detected at ${time}`);
        speakAlert(label);
        autoCapture();
        sendToBackend(detectedShock);

        lastSentTime.current = now;
        shockCount.current   = 0;
        peakShock.current    = 0;

        setTimeout(() => setPothole(false), 4000);
      }
    });
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const autoCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
      });
      if (!result.canceled && result.assets[0]) setLastPhoto(result.assets[0].uri);
    } catch (err) { console.log("Auto capture failed:", err); }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed."); return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
      if (!result.canceled && result.assets[0]) {
        setLastPhoto(result.assets[0].uri);
        setStatus("📸 Photo captured!");
      }
    } catch (err) { console.log("Camera error:", err); }
  };

  const deletePhoto = () => {
    Alert.alert("Delete Photo", "Remove this photo?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { setLastPhoto(null); setStatus("Photo deleted"); } }
    ]);
  };

  // ── Offline / Sync ────────────────────────────────────────────────────────
  const loadOfflineCount = async () => {
    try {
      const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
      if (fi.exists) {
        const data = JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
        setOfflineCount(data.length);
        offlineCountRef.current = data.length;
      }
    } catch (e) { console.log("Offline load failed:", e); }
  };

  const saveOffline = async (payload: any) => {
    try {
      let existing: any[] = [];
      const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
      if (fi.exists) existing = JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
      const entry = { ...payload, savedAt: new Date().toISOString(), photoUri: lastPhoto, synced: false };
      existing.push(entry);
      await FileSystem.writeAsStringAsync(OFFLINE_FILE, JSON.stringify(existing));
      setOfflineCount(existing.length);
    } catch (e) { console.log("Save offline failed:", e); }
  };

  const syncOfflineData = async () => {
    try {
      const fi = await FileSystem.getInfoAsync(OFFLINE_FILE);
      if (!fi.exists) { Alert.alert("No Data", "Nothing to sync!"); return; }
      const data = JSON.parse(await FileSystem.readAsStringAsync(OFFLINE_FILE));
      if (!data.length) { Alert.alert("Already Synced", "All up to date!"); return; }

      setStatus(`Syncing ${data.length} records...`);
      let synced      = 0;
      const failed: any[] = [];

      for (const item of data) {
        try {
          const res = await fetch(BACKEND_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(item),
            signal:  AbortSignal.timeout(5000),
          });
          if (res.ok) synced++;
          else failed.push(item);
        } catch {
          failed.push(item);
        }
      }

      await FileSystem.writeAsStringAsync(OFFLINE_FILE, JSON.stringify(failed));
      setOfflineCount(failed.length);
      setStatus(
        failed.length === 0
          ? `✅ Synced ${synced} records!`
          : `⚠️ Synced ${synced}, ${failed.length} failed`
      );
      Alert.alert(
        "Sync Complete",
        `${synced} potholes uploaded!${failed.length > 0 ? `\n${failed.length} failed — will retry.` : ""}`
      );
    } catch (e) { setStatus("Sync failed. Try again."); }
  };

  // ── Backend ───────────────────────────────────────────────────────────────
  const sendToBackend = async (shock: number) => {
    const loc = locationRef.current;
    if (!loc) return;

    const payload = {
      accelZ:    shock,
      severity:  classifySeverity(shock),
      speed:     speedRef.current,
      lat:       loc.coords.latitude,
      lng:       loc.coords.longitude,
      timestamp: new Date().toISOString(),
      photoUri:  lastPhoto,
    };

    try {
      const res = await fetch(BACKEND_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setIsOnline(true);
        setStatus("Saved to server!");
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      setIsOnline(false);
      await saveOffline(payload);
      setStatus(`Saved offline (${offlineCountRef.current + 1} pending)`);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const shareReport = async () => {
    if (!location) { Alert.alert("No Location", "GPS not ready yet."); return; }
    const msg =
      `POTHOLE ALERT\n\n` +
      `Severity: ${severityLabel || "Unknown"}\n` +
      `Location: ${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}\n` +
      `Speed: ${speed.toFixed(1)} km/h\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `Map: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}\n\n` +
      `Detected by PotholeScan`;
    try {
      if (lastPhoto && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(lastPhoto, { dialogTitle: "Share Pothole Report", mimeType: "image/jpeg" });
      } else {
        await Share.share({ message: msg, title: "Pothole Report" });
      }
    } catch (e) { console.log("Share failed:", e); }
  };

  const resetDetection = () => {
    Alert.alert("Reset Counter", "Reset today's count?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", onPress: () => {
          setTotalDetected(0);
          setLastDetectionTime("");
          setPothole(false);
          setLastPhoto(null);
          setStatus("Counter reset. Ready!");
        }
      },
    ]);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const speedStatus = getSpeedStatus();
  const alertScale  = alertAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Pothole Detection</Text>
          <Text style={styles.appTagline}>Road Intelligence System</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeNum}>{totalDetected}</Text>
          <Text style={styles.badgeLabel}>today</Text>
        </View>
      </View>

      {/* ── CONNECTIVITY BANNER ── */}
      <View style={[styles.banner, { backgroundColor: isOnline ? "#071a07" : "#1a0f00" }]}>
        <View style={[styles.dot, { backgroundColor: isOnline ? "#00C851" : "#FF9500" }]} />
        <Text style={styles.bannerText}>
          {isOnline ? "Connected to Server" : "Working Offline"}
        </Text>
        {offlineCount > 0 && (
          <TouchableOpacity style={styles.syncBtn} onPress={syncOfflineData}>
            <Text style={styles.syncText}>↑ Sync {offlineCount}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── DETECTION TOGGLE ── */}
      <View style={[styles.banner, { backgroundColor: isDetecting ? "#071a07" : "#1a0707", marginBottom: 20 }]}>
        <Animated.View style={[styles.dot, {
          backgroundColor: isDetecting ? "#00C851" : "#FF4444",
          transform: isDetecting ? [{ scale: pulseAnim }] : [],
        }]} />
        <Text style={styles.bannerText}>
          {isDetecting ? "Detection Active" : "Detection Paused"}
        </Text>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: isDetecting ? "#FF4444" : "#00C851" }]}
          onPress={() => setIsDetecting(p => !p)}
        >
          <Text style={styles.toggleText}>{isDetecting ? "Pause" : "Resume"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── SPEED CARD ── */}
      <View style={styles.speedCard}>
        <View style={styles.speedMain}>
          <Text style={styles.speedValue}>{Math.round(speed)}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
        <View style={styles.speedDivider} />
        <View style={styles.speedRight}>
          <Text style={[styles.speedStatus, { color: speedStatus.color }]}>{speedStatus.label}</Text>
          <Text style={styles.speedHint}>
            {speed < MIN_SPEED ? `Need ${MIN_SPEED}+ km/h` : "Detection ON"}
          </Text>
        </View>
      </View>

      {/* ── STATS ROW ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📍</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {location ? `${location.coords.latitude.toFixed(4)}` : "Acquiring..."}
          </Text>
          <Text style={styles.statLabel}>Latitude</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📡</Text>
          <Text style={styles.statValue}>{accel.z.toFixed(2)}g</Text>
          <Text style={styles.statLabel}>Z-Axis</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🚧</Text>
          <Text style={styles.statValue}>{totalDetected}</Text>
          <Text style={styles.statLabel}>Detected</Text>
        </View>
      </View>

      {/* ── SENSOR DETAIL ── */}
      <View style={styles.sensorCard}>
        <Text style={styles.sectionLabel}>ACCELEROMETER</Text>
        <View style={styles.accelRow}>
          {(["x", "y", "z"] as const).map(axis => (
            <View style={styles.axisChip} key={axis}>
              <Text style={styles.axisLabel}>{axis.toUpperCase()}</Text>
              <Text style={styles.axisValue}>{accel[axis].toFixed(3)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── ACTION BUTTONS ── */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: voiceEnabled ? "#00C851" : "#444" }]}
          onPress={() => setVoiceEnabled(p => !p)}
        >
          <Text style={styles.actionIcon}>{voiceEnabled ? "🔊" : "🔇"}</Text>
          <Text style={styles.actionLabel}>{voiceEnabled ? "Voice" : "Muted"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: "#4488ff" }]} onPress={takePhoto}>
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionLabel}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: location ? "#00C851" : "#333", opacity: location ? 1 : 0.4 }]}
          onPress={shareReport}
          disabled={!location}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* ── PHOTO PREVIEW ── */}
      {lastPhoto && (
        <View style={styles.photoCard}>
          <View style={styles.photoHeader}>
            <Text style={styles.sectionLabel}>LATEST CAPTURE</Text>
            <TouchableOpacity onPress={deletePhoto}>
              <Text style={styles.deleteText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
          <Image source={{ uri: lastPhoto }} style={styles.photoPreview} resizeMode="cover" />
        </View>
      )}

      {/* ── LAST DETECTION INFO ── */}
      {lastDetectionTime ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>🕐 Last: {lastDetectionTime}</Text>
          <TouchableOpacity onPress={resetDetection}>
            <Text style={styles.resetText}>Reset All</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── STATUS BAR ── */}
      <Text style={styles.statusText}>{status}</Text>

      {/* ── ALERT CARD ── */}
      {pothole && (
        <Animated.View style={[
          styles.alertCard,
          {
            borderColor: getSeverityColor(severityLabel),
            transform: [{ scale: alertScale }],
          }
        ]}>
          <Animated.Text style={[styles.alertTitle, { opacity: glowOpacity }]}>
            ⚠️  POTHOLE DETECTED
          </Animated.Text>
          <Text style={[styles.alertSeverity, { color: getSeverityColor(severityLabel) }]}>
            {severityLabel}
          </Text>
          {location && (
            <Text style={styles.alertCoords}>
              {location.coords.latitude.toFixed(5)},  {location.coords.longitude.toFixed(5)}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: getSeverityColor(severityLabel) }]}
            onPress={shareReport}
          >
            <Text style={styles.reportBtnText}>📤  Report Now</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#050508", paddingHorizontal: 16 },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  appName:       { fontSize: 26, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  appTagline:    { fontSize: 11, color: "#444", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },
  badge:         { alignItems: "center", backgroundColor: "#0f0f1a", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#222" },
  badgeNum:      { fontSize: 22, fontWeight: "800", color: "#00C851" },
  badgeLabel:    { fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 },
  banner:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1a1a1a" },
  dot:           { width: 9, height: 9, borderRadius: 5, marginRight: 10 },
  bannerText:    { color: "#aaa", flex: 1, fontSize: 13 },
  syncBtn:       { backgroundColor: "#FF9500", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  syncText:      { color: "#fff", fontSize: 12, fontWeight: "700" },
  toggleBtn:     { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  toggleText:    { color: "#fff", fontSize: 12, fontWeight: "700" },
  speedCard:     { backgroundColor: "#0d0d14", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 14, borderWidth: 1, borderColor: "#1c1c2e" },
  speedMain:     { alignItems: "baseline", flexDirection: "row" },
  speedValue:    { fontSize: 54, fontWeight: "800", color: "#fff", lineHeight: 58 },
  speedUnit:     { fontSize: 16, color: "#555", marginLeft: 6, marginBottom: 6 },
  speedDivider:  { width: 1, height: 50, backgroundColor: "#222", marginHorizontal: 20 },
  speedRight:    { flex: 1 },
  speedStatus:   { fontSize: 18, fontWeight: "700" },
  speedHint:     { fontSize: 12, color: "#444", marginTop: 4 },
  statsRow:      { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard:      { flex: 1, backgroundColor: "#0d0d14", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#1c1c2e" },
  statIcon:      { fontSize: 18, marginBottom: 6 },
  statValue:     { color: "#fff", fontSize: 13, fontWeight: "700" },
  statLabel:     { color: "#444", fontSize: 10, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  sensorCard:    { backgroundColor: "#0d0d14", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#1c1c2e" },
  sectionLabel:  { color: "#333", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  accelRow:      { flexDirection: "row", gap: 8 },
  axisChip:      { flex: 1, backgroundColor: "#111120", borderRadius: 10, padding: 10, alignItems: "center" },
  axisLabel:     { color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  axisValue:     { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 4, fontVariant: ["tabular-nums"] },
  buttonRow:     { flexDirection: "row", gap: 10, marginBottom: 14 },
  actionBtn:     { flex: 1, backgroundColor: "#0d0d14", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1.5 },
  actionIcon:    { fontSize: 22 },
  actionLabel:   { color: "#aaa", fontSize: 11, marginTop: 6, fontWeight: "600" },
  photoCard:     { backgroundColor: "#0d0d14", borderRadius: 14, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "#1c1c2e" },
  photoHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, paddingBottom: 8 },
  deleteText:    { color: "#FF4444", fontSize: 13, fontWeight: "600" },
  photoPreview:  { width: "100%", height: 180 },
  infoRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0d0d14", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#1c1c2e" },
  infoText:      { color: "#555", fontSize: 13 },
  resetText:     { color: "#FF4444", fontSize: 13, fontWeight: "600" },
  statusText:    { color: "#333", textAlign: "center", fontSize: 12, marginBottom: 14 },
  alertCard:     { backgroundColor: "#0d0505", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 2, marginBottom: 20 },
  alertTitle:    { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 1, marginBottom: 10 },
  alertSeverity: { fontSize: 26, fontWeight: "800", marginBottom: 8 },
  alertCoords:   { color: "#555", fontSize: 11, fontVariant: ["tabular-nums"], marginBottom: 16 },
  reportBtn:     { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  reportBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
