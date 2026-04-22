import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { courseAPI, userAPI } from "../services/api";
import ConflictAlertModal from "../components/ConflictAlertModal";
import AssigneeSelector from "../components/AssigneeSelector";

const CourseAssignmentScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  // Form state - ASSIGNMENT ONLY (not creation)
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [selectedCourseData, setSelectedCourseData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await courseAPI.getCourses();
      setCourses(response || []);
    } catch (error) {
      console.error("Fetch courses error:", error);
      Alert.alert("Error", "Failed to load courses");
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const match = String(timeString).match(/(\d{1,2}):(\d{2})/);
    if (!match) return "N/A";
    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  const handleAssigneeSelection = (ids, details) => {
    setAssigneeIds(ids);
    setSelectedUsers(
      details ||
        ids.map((id) => ({ id, name: `Faculty #${id}`, userType: "HUMAN" })),
    );
  };

  const removeAssignee = (userId) => {
    const newIds = assigneeIds.filter((id) => id !== userId);
    setAssigneeIds(newIds);
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const validateForm = () => {
    if (!selectedCourse) {
      Alert.alert("Error", "Please select a course");
      return false;
    }
    if (assigneeIds.length === 0) {
      Alert.alert("Error", "Please select at least one faculty member");
      return false;
    }
    return true;
  };

  const handleAssignCourse = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Check for schedule conflicts for the first assignee
      const courseData = courses.find((c) => c.id === parseInt(selectedCourse));
      setSelectedCourseData(courseData);

      const conflictData = {
        faculty_id: parseInt(assigneeIds[0]),
        start_date: courseData.start_date,
        end_date: courseData.end_date,
        schedule_days: courseData.session_days,
        time_slot_start: courseData.session_start_time,
        time_slot_end: courseData.session_end_time,
        course_title: courseData.course_name,
      };

      const response = await api.post("/courses/check-conflict", conflictData);

      if (response.data.has_conflict) {
        setConflicts(response.data.conflicts || []);
        setShowConflictModal(true);
      } else {
        performAssignment();
      }
    } catch (error) {
      console.error("Check conflict error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to check schedule conflicts",
      );
    } finally {
      setLoading(false);
    }
  };

  const performAssignment = async () => {
    setLoading(true);
    try {
      // Assign to all selected faculty members
      for (const facultyId of assigneeIds) {
        const assignmentData = {
          course_id: parseInt(selectedCourse),
          faculty_id: parseInt(facultyId),
          status: "PENDING",
        };

        await api.post("/courses/assign", assignmentData);
      }

      Alert.alert(
        "Success",
        `Course assigned to ${assigneeIds.length} faculty member${assigneeIds.length > 1 ? "s" : ""}!`,
        [
          {
            text: "OK",
            onPress: () => {
              resetForm();
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error("Assignment error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to assign course",
      );
    } finally {
      setLoading(false);
      setShowConflictModal(false);
    }
  };

  const resetForm = () => {
    setSelectedCourse("");
    setAssigneeIds([]);
    setSelectedUsers([]);
    setSelectedCourseData(null);
    setConflicts([]);
    setShowConflictModal(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <Text style={styles.infoLabel}>Select Course</Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <Text style={styles.infoLabel}>Assign Faculty</Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <Text style={styles.infoLabel}>Confirm</Text>
          </View>
        </View>

        {/* Course Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Course *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCourse}
              onValueChange={setSelectedCourse}
              enabled={!loading}
            >
              <Picker.Item label="-- Select Course --" value="" />
              {courses.map((course) => (
                <Picker.Item
                  key={course.id}
                  label={`${course.course_code} - ${course.course_name}`}
                  value={course.id.toString()}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.hint}>Pick a course</Text>
        </View>

        {/* Selected Course Details - Compact Visual */}
        {selectedCourseData && (
          <View style={styles.courseCard}>
            <View style={styles.courseCardHeader}>
              <Ionicons name="book" size={24} color="#7d53f6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.courseCode}>
                  {selectedCourseData.course_code}
                </Text>
                <Text style={styles.courseName}>
                  {selectedCourseData.course_name}
                </Text>
              </View>
            </View>
            <View style={styles.courseCardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={16} color="#666" />
                <Text style={styles.metaText}>
                  {selectedCourseData.start_date}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.metaText}>
                  {formatTime(selectedCourseData.session_start_time)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Faculty Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Assign to Faculty *</Text>

          {/* Selected faculty chips */}
          {selectedUsers.length > 0 && (
            <View style={styles.selectedChipsContainer}>
              {selectedUsers.map((user) => (
                <View key={user.id} style={styles.chip}>
                  <Text style={styles.chipText}>{user.name}</Text>
                  <TouchableOpacity onPress={() => removeAssignee(user.id)}>
                    <Ionicons name="close-circle" size={18} color="#7d53f6" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Button to open assignee selector */}
          <TouchableOpacity
            style={styles.assigneeButton}
            onPress={() => setShowAssigneeModal(true)}
          >
            <Ionicons name="people" size={20} color="#7d53f6" />
            <Text style={styles.assigneeButtonText}>
              {assigneeIds.length === 0
                ? "Add Faculty"
                : `${assigneeIds.length} assigned`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

          <Text style={styles.hint}>Assign to faculty</Text>
        </View>

        {/* Assignee Selector Modal */}
        <AssigneeSelector
          visible={showAssigneeModal}
          selectedIds={assigneeIds}
          onSelectionChange={handleAssigneeSelection}
          onClose={() => setShowAssigneeModal(false)}
        />

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color="#0055CC" />
          <Text style={styles.infoText}>Conflicts checked automatically</Text>
        </View>

        {/* Submit Buttons */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleAssignCourse}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Assign Course</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resetButton]}
          onPress={resetForm}
          disabled={loading}
        >
          <Ionicons name="reload" size={18} color="#7d53f6" />
          <Text style={styles.resetButtonText}>Clear Form</Text>
        </TouchableOpacity>
      </View>

      {/* Conflict Alert Modal */}
      <ConflictAlertModal
        visible={showConflictModal}
        conflicts={conflicts}
        onDismiss={() => setShowConflictModal(false)}
        onReassign={performAssignment}
        loading={loading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  quickInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  infoStep: {
    alignItems: "center",
    gap: 8,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7d53f6",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555",
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#0055CC",
    flex: 1,
    lineHeight: 18,
  },
  courseDetailsBox: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#7d53f6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  courseCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7d53f6",
    marginBottom: 2,
  },
  courseName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  courseCardMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  courseDetailsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7d53f6",
    marginBottom: 8,
  },
  detailRow: {
    fontSize: 13,
    color: "#333",
  },
  detailLabel: {
    fontWeight: "600",
    color: "#7d53f6",
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#7d53f6",
    borderRadius: 10,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#90CAF9",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#7d53f6",
    borderRadius: 10,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  resetButtonText: {
    color: "#7d53f6",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8EAF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    color: "#7d53f6",
    fontWeight: "500",
  },
  assigneeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
  assigneeButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
});

export default CourseAssignmentScreen;
