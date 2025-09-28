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
      Alert.alert("Ready", "Hold your NFC card close to the device");

      // Request technology and wait for tag - avoiding MifareClassic to prevent auto-authentication
      if (Platform.OS === "android") {
        await NfcManager.requestTechnology([
          NfcTech.Ndef,
          NfcTech.NfcA,
          NfcTech.IsoDep,
        ]);
      } else {
        await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.IsoDep]);
      }

      // Get tag and determine type
      const tag = await NfcManager.getTag();
      let type = "Unknown";

      console.log("Tag detected:", tag);
      console.log("Tech types:", tag?.techTypes);

      // Priority order: NDEF > NfcA > IsoDep > MifareClassic (NfcA first to avoid casting issues)
      if (tag?.ndefMessage) {
        type = "NDEF";
      } else if (tag?.techTypes?.includes("android.nfc.tech.NfcA")) {
        // For cards that support both NfcA and MifareClassic, prefer NfcA to avoid casting issues
        type = "NfcA";
      } else if (tag?.techTypes?.includes("android.nfc.tech.IsoDep")) {
        type = "ISO-DEP";
      } else if (tag?.techTypes?.includes("android.nfc.tech.MifareClassic")) {
        type = "MifareClassic";
      }

      console.log("NFC Type detected:", type);
      console.log("About to call readNfc with type:", type);
      await readNfc(type, tag);
    } catch (error) {
      console.error("NFC Error:", error);
      Alert.alert("Error", "Failed to read NFC: " + error);
    } finally {
      setLoading(false);
      NfcManager.cancelTechnologyRequest();
    }
  }
  // Function to read NFC
  async function readNfc(type: string, tag: any) {
    try {
      console.log("Starting NFC read with type:", type);
      console.log("Switch statement - type is:", type);

      switch (type) {
        case "NDEF":
          console.log("Calling readNDef");
          await readNDef();
          break;
        case "MifareClassic":
          console.log("Calling readMiFare");
          await readMiFare();
          break;
        case "NfcA":
          console.log("Calling readNfcA");
          await readNfcA(tag);
          break;
        case "ISO-DEP":
          console.log("Calling readIsoDep");
          await readIsoDep(tag);
          break;
        default:
          console.log("Unsupported NFC type:", type);
          // Show basic tag info for unsupported types
          Alert.alert(
            "Tag Info",
            `Type: ${tag?.type || "Unknown"}\nUID: ${
              tag?.id || "Unknown"
            }\nTech Types: ${tag?.techTypes?.join(", ") || "None"}`
          );
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
      throw ex;
    }
  }

  // Function to read NfcA cards
  async function readNfcA(tag: any) {
    try {
      console.log(
        "🔥 INSIDE readNfcA function - this should NOT call MifareClassic!"
      );
      console.log("Reading NfcA card with tag:", tag);

      // For NfcA cards, we can try to read basic information
      const uid = tag?.id;
      const atqa = tag?.atqa;
      const sak = tag?.sak;

      let info = `UID: ${uid}\n`;
      if (atqa) info += `ATQA: ${atqa}\n`;
      if (sak) info += `SAK: ${sak}\n`;

      console.log("NfcA info built:", info);

      let cardContent = null;

      // Try to read as NDEF if possible
      if (tag?.ndefMessage) {
        console.log("Tag has NDEF message, decoding...");
        const ndefRecord = tag.ndefMessage[0];
        const payload = ndefRecord.payload;
        const payloadBytes = Uint8Array.from(payload);
        const text = Ndef.text.decodePayload(payloadBytes);
        info += `NDEF Content: ${text}\n`;
        cardContent = text;
      } else {
        console.log("No NDEF message found, trying to read data blocks...");

        // Try to read data blocks using NfcA commands
        try {
          console.log("Attempting to read data blocks via NfcA transceive...");

          // Try reading common data blocks (blocks 4-6 often contain user data)
          const blocksToRead = [4, 5, 6, 8, 9, 10];
          let foundData = false;

          for (const blockNum of blocksToRead) {
            try {
              console.log(`Reading block ${blockNum}...`);
              // Use NfcManager.transceive directly for NfcA commands
              const blockData = await NfcManager.transceive([0x30, blockNum]); // MIFARE read command

              if (blockData && blockData.length > 0) {
                // Convert to text
                const textData = String.fromCharCode(
                  ...blockData.filter((byte: number) => byte >= 32 && byte <= 126)
                );
                if (textData.trim().length > 0) {
                  console.log(`Block ${blockNum} contains: ${textData}`);
                  info += `Block ${blockNum}: ${textData.trim()}\n`;
                  if (!cardContent) cardContent = textData.trim();
                  foundData = true;
                }
              }
            } catch (blockError) {
              console.log(`Could not read block ${blockNum}:`, blockError);
            }
          }

          if (!foundData) {
            info += "No readable text data found in common blocks\n";
          }
        } catch (nfcAError) {
          console.log("NfcA transceive not available or failed:", nfcAError);
          info += "Direct block reading not available\n";
        }
      }

      // Set the scanned text to show in UI
      setScannedText(cardContent || uid);

      console.log("Final info:", info);
      console.log("About to show NfcA alert");
      Alert.alert("NfcA Card Info", info);
      console.log("✅ readNfcA completed successfully");
    } catch (ex) {
      console.warn("❌ NfcA read error:", ex);
      // Fallback to basic info
      Alert.alert("NfcA Card", `UID: ${tag?.id || "Unknown"}`);
      setScannedText(tag?.id || "Unknown NfcA card");
    }
  }

  // Function to read ISO-DEP cards
  async function readIsoDep(tag: any) {
    try {
      console.log("Reading ISO-DEP card...");

      const uid = tag?.id;
      const historicalBytes = tag?.historicalBytes;
      const hiLayerResponse = tag?.hiLayerResponse;

      let info = `UID: ${uid}\n`;
      if (historicalBytes) info += `Historical Bytes: ${historicalBytes}\n`;
      if (hiLayerResponse) info += `Hi Layer Response: ${hiLayerResponse}\n`;

      setScannedText(uid);
      Alert.alert("ISO-DEP Card Info", info);
    } catch (ex) {
      console.warn("ISO-DEP read error:", ex);
      Alert.alert("ISO-DEP Card", `UID: ${tag?.id || "Unknown"}`);
      setScannedText(tag?.id || "Unknown ISO-DEP card");
    }
  }

  // Function to read Mifare Classic cards
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
      Alert.alert("Content", text);
    } catch (ex) {
      console.warn("MifareClassic error:", ex);
      throw ex;
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
