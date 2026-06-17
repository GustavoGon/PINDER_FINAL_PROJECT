import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface AdoptionModalProps {
  visible: boolean;
  petName: string;
  petPhoto: string;
  onClose: () => void;
}

export default function AdoptionModal({
  visible,
  petName,
  petPhoto,
  onClose,
}: AdoptionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="heart" size={60} color="#4CAF50" />
          </View>

          <Image source={{ uri: petPhoto }} style={styles.petImage} />

          <Text style={styles.title}>Que adorável! 🐾</Text>
          <Text style={styles.subtitle}>
            Expressaste interesse em adotar{"\n"}
            <Text style={styles.petNameHighlight}>{petName}</Text>
          </Text>

          <View style={styles.messageBox}>
            <FontAwesome5 name="envelope" size={16} color="#5C4A3D" />
            <Text style={styles.messageText}>
              O tutor de {petName} receberá o teu interesse em breve. Ele entrará em contacto contigo!
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Continuar a Procurar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "white",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  petImage: {
    width: 150,
    height: 150,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5C4A3D",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  petNameHighlight: {
    fontWeight: "bold",
    color: "#4CAF50",
    fontSize: 18,
  },
  messageBox: {
    backgroundColor: "#F5F2EB",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
