import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../services/api";

const SettingsScreen = () => {
  const [otpValidity, setOtpValidity] = useState(null);
  const [workingHours, setWorkingHours] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [workingHoursModalVisible, setWorkingHoursModalVisible] =
    useState(false);
  const [adminAccessModalVisible, setAdminAccessModalVisible] = useState(false);

  // Form states
  const [otpInput, setOtpInput] = useState("");
  const [workingStart, setWorkingStart] = useState("");
  const [workingEnd, setWorkingEnd] = useState("");
  const [workingEnabled, setWorkingEnabled] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [otpRes, hoursRes, adminRes] = await Promise.all([
        API.get("/settings/otp-validity"),
        API.get("/settings/working-hours"),
        API.get("/settings/admin-access"),
      ]);

      setOtpValidity(otpRes.data.otp_validity);
      setOtpInput(otpRes.data.otp_validity.toString());

      setWorkingHours(hoursRes.data);
      setWorkingStart(hoursRes.data.start_time || "09:00");
      setWorkingEnd(hoursRes.data.end_time || "17:00");
      setWorkingEnabled(hoursRes.data.enabled !== false);

      setAdminUsers(adminRes.data.users || []);
      const ids = (adminRes.data.user_ids || []).map(String).join(", ");
      setAdminUserIds(ids);
    } catch (error) {
      console.error("Fetch settings error:", error);
      Alert.alert("Error", "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
  };

  const validateTimeFormat = (time) => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const handleOtpUpdate = async () => {
    const validity = parseInt(otpInput);

    if (isNaN(validity) || validity < 30 || validity > 3600) {
      Alert.alert(
        "Validation Error",
        "OTP validity must be between 30 and 3600 seconds",
      );
      return;
    }

    try {
      await API.post("/settings/otp-validity", { otp_validity: validity });
      Alert.alert("Success", "OTP validity updated successfully");
      setOtpModalVisible(false);
      await fetchSettings();
    } catch (error) {
      console.error("Update OTP error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to update OTP validity",
      );
    }
  };

  const handleWorkingHoursUpdate = async () => {
    if (!validateTimeFormat(workingStart) || !validateTimeFormat(workingEnd)) {
      Alert.alert("Validation Error", "Please use HH:MM format (e.g., 09:00)");
      return;
    }

    const [startHour, startMin] = workingStart.split(":").map(Number);
    const [endHour, endMin] = workingEnd.split(":").map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;

    if (startTotalMin >= endTotalMin) {
      Alert.alert("Validation Error", "End time must be after start time");
      return;
    }

    try {
      await API.post("/settings/working-hours", {
        start_time: workingStart,
        end_time: workingEnd,
        enabled: workingEnabled,
      });
      Alert.alert("Success", "Working hours updated successfully");
      setWorkingHoursModalVisible(false);
      await fetchSettings();
    } catch (error) {
      console.error("Update working hours error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to update working hours",
      );
    }
  };

  const handleAdminAccessUpdate = async () => {
    try {
      const ids = adminUserIds
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));

      if (ids.length === 0) {
        Alert.alert("Validation Error", "Please enter at least one user ID");
        return;
      }

      await API.post("/settings/admin-access", { user_ids: ids });
      Alert.alert("Success", "Admin access updated successfully");
      setAdminAccessModalVisible(false);
      await fetchSettings();
    } catch (error) {
      console.error("Update admin access error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to update admin access",
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7d53f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7d53f6"
          />
        }
      >
        {/* OTP Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={20} color="#7d53f6" />
            <Text style={styles.sectionTitle}>OTP Settings</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>OTP Validity</Text>
                <Text style={styles.settingValue}>{otpValidity} seconds</Text>
                <Text style={styles.settingDesc}>
                  {Math.floor(otpValidity / 60)} minute
                  {Math.floor(otpValidity / 60) !== 1 ? "s" : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setOtpModalVisible(true)}
              >
                <Ionicons name="pencil-outline" size={18} color="#7d53f6" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Working Hours Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#7d53f6" />
            <Text style={styles.sectionTitle}>Working Hours</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.hoursInfo}>
                <Text style={styles.settingLabel}>Working Hours</Text>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeValue}>
                    {workingHours?.start_time}
                  </Text>
                  <Text style={styles.timeSeparator}>to</Text>
                  <Text style={styles.timeValue}>{workingHours?.end_time}</Text>
                </View>
                <View
                  style={[
                    styles.enabledBadge,
                    {
                      backgroundColor: workingHours?.enabled
                        ? "#D1FAE5"
                        : "#FEE2E2",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.enabledDot,
                      {
                        backgroundColor: workingHours?.enabled
                          ? "#10B981"
                          : "#EF4444",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.enabledText,
                      {
                        color: workingHours?.enabled ? "#10B981" : "#EF4444",
                      },
                    ]}
                  >
                    {workingHours?.enabled ? "Enabled" : "Disabled"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setWorkingHoursModalVisible(true)}
              >
                <Ionicons name="pencil-outline" size={18} color="#7d53f6" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Admin Access Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#7d53f6"
            />
            <Text style={styles.sectionTitle}>Admin Access</Text>
          </View>

          {adminUsers.length > 0 ? (
            <View style={styles.card}>
              {adminUsers.map((user) => (
                <View key={user.id} style={styles.adminUserItem}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {user.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                  </View>
                  <View style={styles.userBadge}>
                    <Text style={styles.userBadgeText}>
                      {user.user_type.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setAdminAccessModalVisible(true)}
              >
                <Text style={styles.editLink}>Manage Admin Users</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No admin users configured</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setAdminAccessModalVisible(true)}
              >
                <Text style={styles.editLink}>Add Admin Users</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* OTP Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update OTP Validity</Text>
              <TouchableOpacity onPress={() => setOtpModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>OTP Validity (seconds) *</Text>
              <Text style={styles.helpText}>
                Minimum: 30 seconds, Maximum: 3600 seconds
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 300"
                value={otpInput}
                keyboardType="number-pad"
                onChangeText={setOtpInput}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleOtpUpdate}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Working Hours Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={workingHoursModalVisible}
        onRequestClose={() => setWorkingHoursModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Working Hours</Text>
              <TouchableOpacity
                onPress={() => setWorkingHoursModalVisible(false)}
              >
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Start Time (HH:MM) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 09:00"
                value={workingStart}
                onChangeText={setWorkingStart}
              />

              <Text style={styles.label}>End Time (HH:MM) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 17:00"
                value={workingEnd}
                onChangeText={setWorkingEnd}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>
                  Enable Working Hours Validation
                </Text>
                <Switch
                  value={workingEnabled}
                  onValueChange={setWorkingEnabled}
                  trackColor={{ false: "#ddd", true: "#bfa3ff" }}
                  thumbColor={workingEnabled ? "#7d53f6" : "#fff"}
                />
              </View>
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setWorkingHoursModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleWorkingHoursUpdate}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Access Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={adminAccessModalVisible}
        onRequestClose={() => setAdminAccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Admin Users</Text>
              <TouchableOpacity
                onPress={() => setAdminAccessModalVisible(false)}
              >
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>User IDs *</Text>
              <Text style={styles.helpText}>
                Enter user IDs separated by commas (e.g., 1, 5, 10)
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="e.g., 1, 5, 10"
                value={adminUserIds}
                onChangeText={setAdminUserIds}
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setAdminAccessModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleAdminAccessUpdate}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  section: {
    marginVertical: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginLeft: 10,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  settingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7d53f6",
    marginTop: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 3,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f3e8ff",
  },
  hoursInfo: {
    flex: 1,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7d53f6",
  },
  timeSeparator: {
    fontSize: 12,
    color: "#999",
    marginHorizontal: 8,
  },
  enabledBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  enabledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  enabledText: {
    fontSize: 12,
    fontWeight: "600",
  },
  adminUserItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  adminUserItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7d53f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  userAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  userBadge: {
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7d53f6",
  },
  editLink: {
    color: "#7d53f6",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  formContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 15,
    color: "#333",
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  formBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  cancelBtnText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#7d53f6",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default SettingsScreen;
