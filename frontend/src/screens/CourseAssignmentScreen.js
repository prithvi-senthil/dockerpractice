import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { checkScheduleConflict } from "../services/api";
import ConflictAlertModal from "../components/ConflictAlertModal";

const CourseAssignmentScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [faculty, setFaculty] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [proposedCourse, setProposedCourse] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [continueWithConflict, setContinueWithConflict] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scheduleDays, setScheduleDays] = useState("");
  const [timeStart, setTimeStart] = useState("09:00:00");
  const [timeEnd, setTimeEnd] = useState("10:30:00");

  // Load faculty list
  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const response = await api.get("/activities/faculty");
      setFaculty(response.data.faculty || []);
    } catch (error) {
      console.error("Fetch faculty error:", error);
      Alert.alert("Error", "Failed to load faculty list");
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter course title");
      return false;
    }
    if (!selectedFaculty) {
      Alert.alert("Error", "Please select a faculty member");
      return false;
    }
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select start and end dates");
      return false;
    }
    if (!scheduleDays.trim()) {
      Alert.alert(
        "Error",
        "Please enter schedule days (e.g., Monday,Wednesday,Friday)",
      );
      return false;
    }
    if (!timeStart || !timeEnd) {
      Alert.alert("Error", "Please select time slots");
      return false;
    }
    return true;
  };

  const handleCheckConflict = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const conflictData = {
        faculty_id: parseInt(selectedFaculty),
        start_date: startDate,
        end_date: endDate,
        schedule_days: scheduleDays,
        time_slot_start: timeStart,
        time_slot_end: timeEnd,
        course_title: title,
      };

      const response = await checkScheduleConflict(conflictData);

      if (response.has_conflict) {
        setConflicts(response.conflicts);
        setProposedCourse(response.proposed_course);
        setShowConflictModal(true);
      } else {
        handleCreateCourse();
      }
    } catch (error) {
      console.error("Check conflict error:", error);
      Alert.alert("Error", error.error || "Failed to check schedule conflicts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!continueWithConflict && showConflictModal) {
      setShowConflictModal(false);
      setContinueWithConflict(true);
    }

    setLoading(true);
    try {
      const courseData = {
        title,
        assigned_faculty_id: parseInt(selectedFaculty),
        start_date: startDate,
        end_date: endDate,
        schedule_days: scheduleDays,
        time_slot_start: timeStart,
        time_slot_end: timeEnd,
      };

      await api.post("/activities/courses", courseData);

      Alert.alert("Success", "Course created and assigned successfully!", [
        {
          text: "OK",
          onPress: () => {
            resetForm();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("Create course error:", error);
      Alert.alert("Error", error.error || "Failed to create course");
    } finally {
      setLoading(false);
      setContinueWithConflict(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setSelectedFaculty("");
    setStartDate("");
    setEndDate("");
    setScheduleDays("");
    setTimeStart("09:00:00");
    setTimeEnd("10:30:00");
    setConflicts([]);
    setProposedCourse(null);
    setShowConflictModal(false);
    setContinueWithConflict(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Assign Course to Faculty</Text>
        <Text style={styles.headerSubtitle}>
          Create and assign a new course
        </Text>
      </View>

      <View style={styles.card}>
        {/* Workflow Info - NEW */}
        <View style={styles.workflowBox}>
          <Text style={styles.workflowIcon}>⚙️ Workflow</Text>
          <Text style={styles.workflowText}>
            1. Create course and assign to faculty (status: pending)
          </Text>
          <Text style={styles.workflowText}>
            2. Faculty accepts or rejects the assignment
          </Text>
          <Text style={styles.workflowText}>
            3. After faculty accepts, go to{" "}
            <Text style={styles.workflowHighlight}>Enroll Students</Text> to add
            students
          </Text>
        </View>

        {/* Course Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Course Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Advanced Java Programming"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />
        </View>

        {/* Faculty Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Assign to Faculty *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedFaculty}
              onValueChange={setSelectedFaculty}
              enabled={!loading}
              style={styles.picker}
            >
              <Picker.Item label="-- Select Faculty --" value="" />
              {faculty.map((f) => (
                <Picker.Item
                  key={f.id}
                  label={f.name}
                  value={f.id.toString()}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Date Fields */}
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flex]}>
            <Text style={styles.label}>Start Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
              editable={!loading}
            />
          </View>
          <View style={[styles.formGroup, styles.flex]}>
            <Text style={styles.label}>End Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
              editable={!loading}
            />
          </View>
        </View>

        {/* Schedule Days */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Schedule Days *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Monday,Wednesday,Friday"
            value={scheduleDays}
            onChangeText={setScheduleDays}
            editable={!loading}
          />
          <Text style={styles.helperText}>Separate days with commas</Text>
        </View>

        {/* Time Slots */}
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.flex]}>
            <Text style={styles.label}>Start Time *</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM:SS"
              value={timeStart}
              onChangeText={setTimeStart}
              editable={!loading}
            />
          </View>
          <View style={[styles.formGroup, styles.flex]}>
            <Text style={styles.label}>End Time *</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM:SS"
              value={timeEnd}
              onChangeText={setTimeEnd}
              editable={!loading}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            The system will check for schedule conflicts before assignment.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.checkButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleCheckConflict}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkButtonText}>🔍 Check Conflicts</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={resetForm}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Clear Form</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conflict Alert Modal */}
      <ConflictAlertModal
        visible={showConflictModal}
        conflicts={conflicts}
        onDismiss={() => setShowConflictModal(false)}
        onReassign={handleCreateCourse}
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
  header: {
    backgroundColor: "#007AFF",
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  card: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  pickerContainer: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#333",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    fontStyle: "italic",
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
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: "#0055CC",
    flex: 1,
    lineHeight: 18,
  },
  workflowBox: {
    backgroundColor: "#f0f4ff",
    borderLeftWidth: 4,
    borderLeftColor: "#7d53f6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 18,
  },
  workflowIcon: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "700",
    color: "#7d53f6",
  },
  workflowText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    marginBottom: 4,
  },
  workflowHighlight: {
    color: "#7d53f6",
    fontWeight: "700",
  },
  buttonGroup: {
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  checkButton: {
    backgroundColor: "#007AFF",
  },
  checkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default CourseAssignmentScreen;
