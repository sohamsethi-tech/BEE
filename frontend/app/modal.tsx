import { Link } from "expo-router";
import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">This is a modal</ThemedText>

      {/*
        FIX: `dismissTo` prop does not exist on <Link> in Expo Router v3.
        Use `dismiss()` from `useRouter()` to go back, or `href="/"` with
        `router.back()`. For a simple "go home" link, `href="/"` is correct.
        If you need to dismiss a modal stack, use:
          const router = useRouter(); router.dismiss();
      */}
      <Link href="/" style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
