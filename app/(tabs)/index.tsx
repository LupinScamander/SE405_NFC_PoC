import NFCReadButton from "@/components/nfc-read-button";
import NfcRewriteButton from "@/components/nfc-rewrite-button";
import { useEffect } from "react";
import { Alert, ImageBackground, StyleSheet, Text, View } from "react-native";
import NfcManager from "react-native-nfc-manager";
import { SafeAreaView } from "react-native-safe-area-context";

async function initNFC() {
  try {
    await NfcManager.start();
    console.log("NFC Manager started successfully");
    Alert.alert("NFC Status", "Started!");
  } catch (err) {
    console.warn("Failed to start NFC:", err);
    Alert.alert("NFC Status", "Failed!");
  }
}
export default function HomeScreen() {
  const image = require("@/assets/images/nfc-bg.jpg");

  useEffect(() => {
    initNFC();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ImageBackground source={image} resizeMode="cover" style={styles.image}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>NFC Demo</Text>
          <View style={styles.nfcContainer}>
            <NfcRewriteButton />
            <NFCReadButton />
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  image: {
    flex: 1,
    width: "100%",
    height: "auto",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0641b8ff",
    marginBottom: 32,
    textAlign: "center",
  },
  nfcContainer: {
    width: "100%",
    maxWidth: 400,
    gap: 16,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
  },
});
