import { Tabs, useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getToken } from "@/utils/auth";

function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (cancelled) return;

      const inTabs = segments[0] === "(tabs)";
      const inAuth = segments[0] === "auth";

      if (!token && inTabs) {
        routerRef.current.replace("/auth");
      } else if (token && inAuth) {
        routerRef.current.replace("/(tabs)");
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments[0]]);

  return ready;
}

export default function TabLayout() {
  const ready = useAuthGuard();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#050508",
        }}
      >
        <ActivityIndicator size="large" color="#00C851" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: "#00C851",
        tabBarInactiveTintColor: "#333",
        tabBarStyle: {
          backgroundColor: "#0a0a0e",
          borderTopColor: "#111",
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Detect",
          tabBarIcon: ({ color, focused }) => (
            <Icon name="location.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <Icon name="map.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Records",
          tabBarIcon: ({ color, focused }) => (
            <Icon name="list.bullet" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Icon name="person.fill" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function Icon({
  name,
  color,
  focused,
}: {
  name: Parameters<typeof IconSymbol>[0]["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <IconSymbol size={22} name={name} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { padding: 4, borderRadius: 10 },
  iconWrapActive: { backgroundColor: "#00C85118" },
});
