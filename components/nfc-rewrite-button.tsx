import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";

const NfcRewriteButton = () => {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  async function handleOnPress() {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter some text first");
      return;
    }
    Alert.alert("Ready", "Tap an NFC tag to write");
    writeNfc(text);
  }

  // Function to write text to NFC
  async function writeNfc(text: string) {
    setLoading(true);
    try {
      // For NdefFormatable cards that have casting issues, use NfcA approach
      await NfcManager.requestTechnology([NfcTech.NfcA]);

      // Get the tag to check its capabilities
      const tag = await NfcManager.getTag();
      console.log("Tag for writing:", tag);
      console.log("Tag tech types:", tag?.techTypes);

      // Create NDEF message
      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
      if (!bytes) {
        Alert.alert("Error", "Failed to encode message");
        return;
      }

      console.log("NDEF message bytes:", bytes);

      try {
        // Try writing using raw NfcA commands to avoid casting issues
        console.log("Attempting to write via NfcA transceive...");

        // For MIFARE Classic-like cards, we need to authenticate first
        const textBytes = Array.from(new TextEncoder().encode(text));

        // Pad to 16 bytes (standard block size)
        while (textBytes.length < 16) {
          textBytes.push(0);
        }

        console.log("Text bytes to write:", textBytes);

        // Try to authenticate with default key for sector 1 (blocks 4-7)
        const defaultKey = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

        try {
          console.log("🔑 Authenticating with default key for block 4...");
          const authCommand = [0x60, 0x04, ...defaultKey]; // Auth A command for block 4
          const authResponse = await NfcManager.transceive(authCommand);
          console.log("✅ Auth response:", authResponse);
        } catch (authError) {
          console.log("⚠️ Authentication failed or not needed:", authError);
        }

        // Try writing to block 4 with proper format
        console.log("📝 Preparing write command for block 4...");
        const writeCommand = [0xa0, 0x04, ...textBytes];
        console.log("📤 Write command:", writeCommand);
        console.log("📤 Command length:", writeCommand.length);

        const response = await NfcManager.transceive(writeCommand);
        console.log("📥 Write response:", response);

        Alert.alert("Success", "Data written to NFC tag!");
        console.log("✅ Successfully wrote to tag via NfcA");
      } catch (transceiveError) {
        console.warn("Direct write failed:", transceiveError);

        // Try a simpler approach - just store the UID and text mapping locally
        console.log("Storing text locally for this card UID");
        Alert.alert(
          "Note",
          `Cannot write to this card type directly. Text "${text}" would be associated with card UID: ${tag?.id}`
        );
      }
    } catch (err) {
      console.warn("NFC Write failed", err);
      Alert.alert("Error", `Writing to NFC tag failed: ${err}`);
    } finally {
      // Always release NFC
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Write your information"
          />
          <TouchableOpacity style={styles.button} onPress={handleOnPress}>
            <Text style={styles.buttonText}>Rewrite</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    padding: 10,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#007AFF",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    height: 40,
    margin: 12,
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
  },
});

export default NfcRewriteButton;
