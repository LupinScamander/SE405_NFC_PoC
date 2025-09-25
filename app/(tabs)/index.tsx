import NFCReadButton from "@/components/nfc-read-button";
import NfcRewriteButton from "@/components/nfc-rewrite-button";
import { useEffect } from "react";
import { Alert, ImageBackground, StyleSheet, Text } from "react-native";
import NfcManager from "react-native-nfc-manager";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

async function initNFC() {
  try {
    await NfcManager.start();
    console.log("NFC Manager started successfully");
    Alert.alert("NFC Status","Started!")
  } catch (err) {
    console.warn("Failed to start NFC:", err);
    Alert.alert("NFC Status", "Failed!")
  }
}
export default function HomeScreen() {
  const image = require("@/assets/images/nfc-bg.jpg");

  useEffect(() => {
    initNFC();
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <ImageBackground
          source={image}
          resizeMode="cover"
          style={styles.image}
        >
          <Text style={styles.text}>NFC Demo</Text>
          <NfcRewriteButton />
          <NFCReadButton />
        </ImageBackground>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 20,
  },
});
