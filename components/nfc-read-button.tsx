import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";

const NFCReadButton = () => {
  const [loading, setLoading] = useState(false);
  const [scannedText, setScannedText] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request tech
  async function requestTech(): Promise<string> {
    if (Platform.OS === "android") {
      try {
        await NfcManager.requestTechnology([
          NfcTech.Ndef,
          NfcTech.NfcA,
          NfcTech.IsoDep,
          NfcTech.MifareClassic,
        ]);
      } catch (error) {
        console.log("Tech request error:", error);
        throw error;
      }
    } else {
      try {
        await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.IsoDep]);
      } catch (error) {
        console.log("Tech request error:", error);
      }
    }
    const tag = await NfcManager.getTag();
    if (tag?.ndefMessage) {
      return "NDEF";
    }

    if (tag?.techTypes?.includes("android.nfc.tech.MifareClassic")) {
      return "MifareClassic";
    }

    if (tag?.techTypes?.includes("android.nfc.tech.IsoDep")) {
      return "ISO-DEP";
    }

    return "Unknown";
  }

  // Clear scanned text after 10 seconds
  useEffect(() => {
    if (scannedText) {
      timeoutRef.current = setTimeout(() => {
        setScannedText(null);
      }, 10000); // 10 seconds
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scannedText]);

  // Handle tap outside to dismiss
  const handlePressOutside = () => {
    if (scannedText) {
      setScannedText(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  async function handleOnPress() {
    try {
      // Check if NFC is supported
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        Alert.alert("Error", "NFC is not supported on this device");
        return;
      }

      // Check if NFC is enabled
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        Alert.alert("Error", "Please enable NFC in your device settings");
        return;
      }

      setLoading(true);
      const type = await requestTech();
      console.log("NFC Type detected:", type);

      readNfc(type);
      Alert.alert("Ready", "Hold your NFC card close to the device");
    } catch (error) {
      console.error("NFC Error:", error);
      Alert.alert("Error", "Failed to initialize NFC: " + error);
    } finally {
      setLoading(false);
    }
  }
  // Function to read NFC
  async function readNfc(type: string) {
    try {
      console.log("Starting NFC read with type:", type);

      switch (type) {
        case "NDEF":
          await readNDef();
          break;
        case "MifareClassic":
          await readMiFare();
          break;
        default:
          console.log("Unsupported NFC type:", type);
          Alert.alert("Error", "Unsupported NFC card type");
          break;
      }
    } catch (error) {
      console.error("Read NFC Error:", error);
      Alert.alert("Error", "Failed to read NFC: " + error);
    }
  }
  // Function to read text from NFC - NDef
  async function readNDef() {
    try {
      const tag = await NfcManager.getTag();
      console.log("Raw tag", tag);

      if (tag?.ndefMessage) {
        // Take the first record's payload
        const ndefRecord = tag.ndefMessage[0];
        const payload = ndefRecord.payload;

        //Convert plain array -> Uint8Array
        const payloadBytes = Uint8Array.from(payload);

        // Decode as text
        const text = Ndef.text.decodePayload(payloadBytes);
        console.log("Decoded text:", text);
        setScannedText(text); // Save the scanned text to state
        Alert.alert("Content", text); // Show result after scan
      } else {
        // Fallback: just show UID / ID
        Alert.alert("Tag Type", `${tag?.type}\nUID: ${tag?.id}`);
      }
    } catch (ex) {
      console.warn("NFC read error", ex);
      setScannedText(null);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  }

  // Function to read Mifare
  async function readMiFare() {
    try {
      const mifare = NfcManager.mifareClassicHandlerAndroid;

      // Authenticate a sector with default key (0xFFFFFFFFFFFF)
      const sectorIndex = 1;
      const blockIndex = sectorIndex * 4; // each sector = 4 blocks
      const keyA = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
      await mifare.mifareClassicAuthenticateA(sectorIndex, keyA);

      // Read a block
      const blockData = await mifare.mifareClassicReadBlock([blockIndex]);
      console.log("Block Data:", blockData);

      // Convert to text
      const byteArray = Array.from(blockData);
      const text = String.fromCharCode(...byteArray);
      console.log("Decoded Block:", text);
      setScannedText(text);
    } catch (ex) {
      console.warn("MifareClassic error:", ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  }
  return (
    <TouchableWithoutFeedback onPress={handlePressOutside}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleOnPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.text}>Read NFC</Text>
          )}
        </TouchableOpacity>

        {/* NFC Content Display Section */}
        {scannedText && (
          <TouchableWithoutFeedback>
            <View style={styles.contentContainer}>
              <Text style={styles.label}>Scanned Content:</Text>
              <View style={styles.textContainer}>
                <Text style={styles.scannedText}>{scannedText}</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    padding: 10,
    gap: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
  },
  contentContainer: {
    width: "100%",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  textContainer: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  scannedText: {
    fontSize: 14,
    color: "#333",
  },
});

export default NFCReadButton;
