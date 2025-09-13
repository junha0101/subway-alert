// /subway-alert/components/NicknameOnboarding.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import COLORS from "../lib/colors";
import { useUser } from "../store/useUser";

type Props = {
  visible: boolean;       // 부모(Home)에서 제어
  onClose: () => void;    // 완료 후 닫기
};

export default function NicknameOnboarding({ visible, onClose }: Props) {
  const { setNickname, setHasOnboarded } = useUser();
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value.trim()) return;
    setNickname(value.trim());
    setHasOnboarded(true);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>닉네임을 입력해주세요</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 준하"
            value={value}
            onChangeText={setValue}
          />
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>계속하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: COLORS.textTitle,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});