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
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert("Success", "Data written to NFC tag!");
        console.log("Successfully wrote to NFC tag");
      } else {
        Alert.alert("Error", "Failed to encode message");
      }
    } catch (err) {
      console.warn("NFC Write failed", err);
      Alert.alert("Error", "Writing to NFC tag failed");
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
