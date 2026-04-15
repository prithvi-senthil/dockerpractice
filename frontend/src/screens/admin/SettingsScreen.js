import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";

const SettingsScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // OTP validity setting state
  const [otpValiditySeconds, setOtpValiditySeconds] = useState("10");
  const [otpSettingLoading, setOtpSettingLoading] = useState(false);
  const [otpSettingSaving, setOtpSettingSaving] = useState(false);

  // Working hours setting state
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(true);
  const [workingStartTime, setWorkingStartTime] = useState("08:00");
  const [workingEndTime, setWorkingEndTime] = useState("17:00");
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);
  const [workingHoursSaving, setWorkingHoursSaving] = useState(false);

  // Check if user is admin
  const isAdmin = user?.user_type === "admin";

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("📱 SettingsScreen FOCUSED - Refetching all data");
      if (isAdmin) {
        console.log("👤 User is admin, fetching...");
        fetchOTPSetting();
        fetchWorkingHours();
      } else {
        console.log("⛔ User is NOT admin");
      }
    }, [isAdmin]),
  );

  const fetchOTPSetting = async () => {
    try {
      setOtpSettingLoading(true);
      const response = await API.get("/settings/otp-validity");
      if (response.data?.value) {
        setOtpValiditySeconds(response.data.value.toString());
      }
    } catch (error) {
      console.error("Fetch OTP setting error:", error);
      // Use default
      setOtpValiditySeconds("10");
    } finally {
      setOtpSettingLoading(false);
    }
  };

  const fetchWorkingHours = async () => {
    try {
      setWorkingHoursLoading(true);
      const response = await API.get("/settings/working-hours");
      console.log(
        "📥 Full working hours response:",
        JSON.stringify(response.data, null, 2),
      );

      if (response.data) {
        const enabledValue = response.data.working_hours_enabled;
        console.log(
          "🔍 enabledValue:",
          enabledValue,
          "| type:",
          typeof enabledValue,
        );

        // CRITICAL: Explicitly detect false vs true
        // In JSON: false is literally false, true is literally true
        let enabled;
        if (enabledValue === false || enabledValue === "false") {
          enabled = false;
          console.log("✅ Correctly detected: FALSE");
        } else if (enabledValue === true || enabledValue === "true") {
          enabled = true;
          console.log("✅ Correctly detected: TRUE");
        } else {
          // Fallback: treat as false for any other value
          enabled = false;
          console.log("⚠️  Unknown value, defaulting to FALSE");
        }

        console.log("🔧 FINAL: Setting workingHoursEnabled =", enabled);
        setWorkingHoursEnabled(enabled);

        setWorkingStartTime(
          response.data.working_hours_start ||
            response.data.start_time ||
            "08:00",
        );
        setWorkingEndTime(
          response.data.working_hours_end || response.data.end_time || "17:00",
        );
      }
    } catch (error) {
      console.error("❌ Fetch working hours error:", error);
      // Do NOT change state on error - keep existing state
    } finally {
      setWorkingHoursLoading(false);
    }
  };

  const handleSaveOTPSetting = async () => {
    try {
      const seconds = parseInt(otpValiditySeconds);

      if (isNaN(seconds) || seconds < 5 || seconds > 300) {
        Alert.alert("Error", "OTP validity must be between 5 and 300 seconds");
        return;
      }

      setOtpSettingSaving(true);
      await API.put("/settings/otp-validity", { validity_seconds: seconds });

      // Refetch the setting to ensure persistent display
      await fetchOTPSetting();

      Alert.alert("Success", `OTP validity updated to ${seconds} seconds`, [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Save OTP setting error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to update OTP validity",
      );
    } finally {
      setOtpSettingSaving(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    try {
      console.log("💾 SAVING Working Hours - Current state:");
      console.log(
        "   workingHoursEnabled:",
        workingHoursEnabled,
        typeof workingHoursEnabled,
      );
      console.log("   workingStartTime:", workingStartTime);
      console.log("   workingEndTime:", workingEndTime);

      // Validate time format (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

      if (!timeRegex.test(workingStartTime)) {
        Alert.alert(
          "Error",
          "Invalid start time format. Use HH:MM (e.g., 08:00)",
        );
        return;
      }

      if (!timeRegex.test(workingEndTime)) {
        Alert.alert(
          "Error",
          "Invalid end time format. Use HH:MM (e.g., 17:00)",
        );
        return;
      }

      // Validate that start time is before end time
      if (workingStartTime >= workingEndTime) {
        Alert.alert("Error", "Start time must be before end time");
        return;
      }

      const payload = {
        enabled: workingHoursEnabled,
        start_time: workingStartTime,
        end_time: workingEndTime,
      };

      console.log("📤 Sending to backend:", JSON.stringify(payload, null, 2));

      setWorkingHoursSaving(true);
      const response = await API.put("/settings/working-hours", payload);

      console.log(
        "📥 Response from backend:",
        JSON.stringify(response.data, null, 2),
      );

      // Refetch the settings to ensure persistent display
      await fetchWorkingHours();

      Alert.alert(
        "Success",
        workingHoursEnabled
          ? `Working hours set to ${workingStartTime} - ${workingEndTime}`
          : "Working hour restrictions disabled",
        [{ text: "OK" }],
      );
    } catch (error) {
      console.error("Save working hours error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to update working hours",
      );
    } finally {
      setWorkingHoursSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={48} color="#ccc" />
          <Text style={styles.unauthorizedText}>Access Denied</Text>
          <Text style={styles.unauthorizedSubText}>
            Only admin users can access system settings
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Settings</Text>
        <Text style={styles.headerSubtitle}>
          Manage OTP and working hours settings
        </Text>
      </View>

      {/* OTP Settings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key" size={24} color="#7d53f6" />
          <Text style={styles.sectionTitle}>OTP Settings</Text>
        </View>

        <Text style={styles.sectionDescription}>
          Configure One-Time Password validity duration for attendance marking
        </Text>

        {otpSettingLoading ? (
          <ActivityIndicator
            size="small"
            color="#7d53f6"
            style={{ marginTop: 16 }}
          />
        ) : (
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>OTP Validity Duration</Text>
                <Text style={styles.settingHint}>
                  How long the OTP remains valid (5-300 seconds)
                </Text>
              </View>
              <View style={styles.settingControl}>
                <TextInput
                  style={styles.settingInput}
                  value={otpValiditySeconds}
                  onChangeText={setOtpValiditySeconds}
                  keyboardType="numeric"
                  placeholder="10"
                />
                <Text style={styles.settingUnit}>sec</Text>
              </View>
            </View>

            <View style={styles.settingTimeDisplay}>
              <Text style={styles.settingTimeText}>
                OTP will expire after {otpValiditySeconds} seconds
              </Text>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveOTPSetting}
              disabled={otpSettingSaving}
            >
              {otpSettingSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save OTP Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Working Hours Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={24} color="#7d53f6" />
          <Text style={styles.sectionTitle}>Working Hours</Text>
        </View>

        <Text style={styles.sectionDescription}>
          Define working hours - sessions can only be scheduled within this time
          window
        </Text>

        {workingHoursLoading ? (
          <ActivityIndicator
            size="small"
            color="#7d53f6"
            style={{ marginTop: 16 }}
          />
        ) : (
          <View style={styles.settingCard}>
            {/* Enable/Disable Toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setWorkingHoursEnabled(!workingHoursEnabled)}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.settingLabel}>
                  Enable Working Hours Restriction
                </Text>
                <Text style={styles.settingHint}>
                  {workingHoursEnabled
                    ? "Sessions can only be scheduled within working hours"
                    : "Sessions can be scheduled at any time"}
                </Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  workingHoursEnabled && styles.toggleActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    workingHoursEnabled && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {/* Time Settings */}
            {workingHoursEnabled && (
              <>
                <View style={styles.divider} />

                <View style={styles.timeRow}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Work Start Time</Text>
                    <View style={styles.timeInputWrapper}>
                      <Ionicons name="time-outline" size={20} color="#666" />
                      <TextInput
                        style={styles.timeInput}
                        value={workingStartTime}
                        onChangeText={setWorkingStartTime}
                        placeholder="08:00"
                        maxLength={5}
                      />
                    </View>
                    <Text style={styles.timeHint}>
                      Sessions cannot start before this time
                    </Text>
                  </View>

                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Work End Time</Text>
                    <View style={styles.timeInputWrapper}>
                      <Ionicons name="time-outline" size={20} color="#666" />
                      <TextInput
                        style={styles.timeInput}
                        value={workingEndTime}
                        onChangeText={setWorkingEndTime}
                        placeholder="17:00"
                        maxLength={5}
                      />
                    </View>
                    <Text style={styles.timeHint}>
                      Sessions cannot end after this time
                    </Text>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#7d53f6"
                  />
                  <Text style={styles.infoText}>
                    Sessions scheduled outside working hours will be rejected.
                    For example: 08:00 to 17:00 means sessions cannot be
                    scheduled before 8 AM or after 5 PM.
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveWorkingHours}
              disabled={workingHoursSaving}
            >
              {workingHoursSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Working Hours</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <View style={styles.infoCard}>
          <Ionicons name="bulb" size={24} color="#F59E0B" />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Settings Tips</Text>
            <Text style={styles.infoCardText}>
              • OTP validity: Lower values (5-10 sec) are more secure{"\n"}•
              Working hours: Helps organize sessions during business hours{"\n"}
              • Changes apply immediately to new sessions
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  unauthorizedText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  unauthorizedSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  header: {
    backgroundColor: "#7d53f6",
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#ede9ff",
    marginTop: 4,
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  settingHint: {
    fontSize: 12,
    color: "#666",
  },
  settingControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 70,
    textAlign: "center",
  },
  settingUnit: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  settingTimeDisplay: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  settingTimeText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: "#7d53f6",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  timeInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: "#333",
  },
  timeHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    fontStyle: "italic",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#ede9ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#5b21b6",
    marginLeft: 8,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  infoCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 12,
    color: "#B45309",
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: "#7d53f6",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default SettingsScreen;
