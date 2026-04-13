import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const ActivityDetailScreen = ({ route, navigation }) => {
  const { sessionId, courseTitle, facultyName } = route.params;
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState("");
  const [activeOTP, setActiveOTP] = useState(null);
  const [showOTPGeneration, setShowOTPGeneration] = useState(false);
  const [otpType, setOtpType] = useState(null); // 'start' or 'end'

  const isFaculty = user?.user_type === "faculty";
  const isStudent = user?.user_type === "student";

  useEffect(() => {
    fetchSessionDetails();
  }, []);

  const fetchSessionDetails = async () => {
    try {
      const response = await api.get(`/activities/sessions/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      console.error("Fetch session error:", error);
      Alert.alert("Error", "Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOTP = async (type) => {
    try {
      setOtpType(type);
      const endpoint =
        type === "start"
          ? `/activities/sessions/${sessionId}/generate-start-otp`
          : `/activities/sessions/${sessionId}/generate-end-otp`;

      const response = await api.post(endpoint);
      setActiveOTP(response.data.otp);
      setShowOTPGeneration(true);

      Alert.alert(
        `${type.toUpperCase()} OTP Generated`,
        `OTP: ${response.data.otp}\nValid for 5 minutes`,
        [{ text: "OK", onPress: () => fetchSessionDetails() }],
      );
    } catch (error) {
      console.error("Generate OTP error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to generate OTP",
      );
    }
  };

  const handleMarkAttendance = async (type) => {
    if (otpInput.length !== 6) {
      Alert.alert("Error", "Please enter 6-digit OTP");
      return;
    }

    try {
      const endpoint =
        type === "start" ? "/attendance/mark-start" : "/attendance/mark-end";
      const response = await api.post(endpoint, {
        sessionId,
        otp: otpInput,
      });

      Alert.alert(
        "Success",
        type === "start"
          ? "Start attendance marked!"
          : `End attendance marked!\nDuration: ${response.data.duration}`,
      );

      setOtpInput("");
      fetchSessionDetails();
    } catch (error) {
      console.error("Mark attendance error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to mark attendance",
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Session Header */}
      <View style={styles.card}>
        <Text style={styles.title}>{courseTitle}</Text>
        <Text style={styles.faculty}>👨‍🏫 {facultyName}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{session.session_date}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>
            {session.start_time} - {session.end_time}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text
            style={[styles.value, { color: getStatusColor(session.status) }]}
          >
            {session.status?.toUpperCase()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Enrolled:</Text>
          <Text style={styles.value}>
            {session.enrolled_count}/{session.max_students} students
          </Text>
        </View>
      </View>

      {/* Faculty: OTP Generation */}
      {isFaculty && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🔐 OTP Management</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#4CAF50" }]}
            onPress={() => handleGenerateOTP("start")}
          >
            <Text style={styles.buttonText}>Generate Start OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: "#FF5722", marginTop: 12 },
            ]}
            onPress={() => handleGenerateOTP("end")}
          >
            <Text style={styles.buttonText}>Generate End OTP</Text>
          </TouchableOpacity>

          {activeOTP && (
            <View style={styles.activeOTPBox}>
              <Text style={styles.otpLabel}>Active OTP:</Text>
              <Text style={styles.otpDisplay}>{activeOTP}</Text>
              <Text style={styles.otpExpiry}>Valid for 5 minutes</Text>
            </View>
          )}
        </View>
      )}

      {/* Student: OTP Entry */}
      {isStudent && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>✍️ Mark Attendance</Text>

          {session.status === "ongoing" ? (
            <>
              <Text style={styles.instructionText}>
                Enter the OTP provided by your instructor
              </Text>

              <TextInput
                style={styles.otpInput}
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                value={otpInput}
                onChangeText={setOtpInput}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleMarkAttendance("start")}
              >
                <Text style={styles.buttonText}>Mark Start Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: "#2196F3", marginTop: 12 },
                ]}
                onPress={() => handleMarkAttendance("end")}
              >
                <Text style={styles.buttonText}>Mark End Attendance</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>
                Session is {session.status}. OTP entry is only available during
                ongoing sessions.
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case "ongoing":
      return "#4CAF50";
    case "completed":
      return "#2196F3";
    case "scheduled":
      return "#FF9800";
    default:
      return "#9E9E9E";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
  },
  card: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  faculty: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#1976D2",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: "#1976D2",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 2,
    marginVertical: 12,
  },
  activeOTPBox: {
    backgroundColor: "#E8F5E9",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  otpLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  otpDisplay: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
    letterSpacing: 4,
    textAlign: "center",
  },
  otpExpiry: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    fontStyle: "italic",
  },
  statusBox: {
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
    padding: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#E65100",
    fontWeight: "500",
  },
});

export default ActivityDetailScreen;
