import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const OTPModal = ({
  visible,
  onClose,
  onSubmit,
  title = "Enter OTP",
  description = "OTP is valid for 10 seconds only",
  type = "start", // 'start' or 'end'
  sessionId,
  loading = false,
}) => {
  const [otp, setOTP] = useState("");
  const [timeLeft, setTimeLeft] = useState(10);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) {
      setOTP("");
      setTimeLeft(10);
      setSubmitted(false);
      return;
    }

    // Start countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const handleOTPChange = (text) => {
    // Only allow numbers
    const numericOTP = text.replace(/[^0-9]/g, "");
    setOTP(numericOTP);
  };

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter a 6-digit OTP");
      return;
    }

    if (timeLeft <= 0) {
      Alert.alert(
        "OTP Expired",
        "This OTP has expired. Please ask the faculty for a new one.",
      );
      return;
    }

    setSubmitted(true);
    try {
      await onSubmit({ otp, sessionId, type });
      setOTP("");
      onClose();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to submit OTP");
    } finally {
      setSubmitted(false);
    }
  };

  const getTimeColor = () => {
    if (timeLeft > 5) return "#4CAF50";
    if (timeLeft > 2) return "#FF9800";
    return "#F44336";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Timer Badge */}
          <View
            style={[styles.timerBadge, { backgroundColor: getTimeColor() }]}
          >
            <Ionicons name="timer" size={16} color="#fff" />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* OTP Type Indicator */}
          <View style={styles.typeIndicator}>
            <Ionicons
              name={type === "start" ? "play-circle" : "stop-circle"}
              size={20}
              color={type === "start" ? "#4CAF50" : "#F44336"}
            />
            <Text style={styles.typeText}>
              {type === "start" ? "Class Start OTP" : "Class End OTP"}
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpInputContainer}>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#CCC"
              value={otp}
              onChangeText={handleOTPChange}
              maxLength={6}
              keyboardType="number-pad"
              editable={!submitted && timeLeft > 0}
              selectTextOnFocus
            />
            {otp.length === 6 && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </View>

          {/* Character Count */}
          <Text style={styles.charCount}>{otp.length}/6 digits</Text>

          {/* Warning if expired */}
          {timeLeft <= 0 && (
            <View style={styles.expiredWarning}>
              <Ionicons name="alert-circle" size={20} color="#F44336" />
              <Text style={styles.expiredText}>
                OTP has expired. Please try again.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelBtn, { opacity: submitted ? 0.6 : 1 }]}
              onPress={onClose}
              disabled={submitted}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  opacity:
                    submitted || otp.length !== 6 || timeLeft <= 0 ? 0.6 : 1,
                  backgroundColor:
                    otp.length === 6 && timeLeft > 0 ? "#4CAF50" : "#CCC",
                },
              ]}
              onPress={handleSubmit}
              disabled={submitted || otp.length !== 6 || timeLeft <= 0}
            >
              {submitted ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit OTP</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#2196F3" />
            <Text style={styles.infoText}>
              Make sure to enter OTP within 10 seconds for attendance to be
              marked.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 15,
    gap: 6,
  },
  timerText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  typeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  typeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  otpInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  otpInput: {
    flex: 1,
    height: 60,
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 10,
    color: "#333",
    textAlign: "center",
  },
  charCount: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    marginBottom: 15,
  },
  expiredWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  expiredText: {
    color: "#F44336",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 15,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "500",
    flex: 1,
  },
});

export default OTPModal;
