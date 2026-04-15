import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { courseAPI, userAPI } from "../services/api";

const DAYS_OF_WEEK = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
];

const CreateCourseScreen = ({ navigation }) => {
  // Form States
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessionDays, setSessionDays] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState("");
  const [sessionEndTime, setSessionEndTime] = useState("");

  // UI States
  const [loading, setLoading] = useState(false);
  const [faculty, setFaculty] = useState([]);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  useEffect(() => {
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    try {
      const response = await userAPI.getAssignableUsers({ limit: 100 });
      setFaculty(response || []);
    } catch (error) {
      console.error("Load faculty error:", error);
      Alert.alert("Error", "Failed to load faculty members");
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date) => {
    if (!date) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}:00`;
  };

  const parseDateTimeLocal = (ymd, hhmmss) => {
    if (!ymd || !hhmmss) return null;
    const [year, month, day] = String(ymd)
      .split("-")
      .map((v) => parseInt(v, 10));
    const [hour, minute] = String(hhmmss)
      .split(":")
      .map((v) => parseInt(v, 10));
    if (
      [year, month, day, hour, minute].some((v) => Number.isNaN(v)) ||
      !year ||
      !month ||
      !day
    ) {
      return null;
    }
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setTempStartDate(selectedDate);
      setStartDate(formatDate(selectedDate));
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setTempEndDate(selectedDate);
      setEndDate(formatDate(selectedDate));
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setTempStartTime(selectedTime);
      setSessionStartTime(formatTime(selectedTime));
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setTempEndTime(selectedTime);
      setSessionEndTime(formatTime(selectedTime));
    }
  };

  const toggleDay = (dayValue) => {
    if (sessionDays.includes(dayValue)) {
      setSessionDays(sessionDays.filter((d) => d !== dayValue));
    } else {
      setSessionDays([...sessionDays, dayValue]);
    }
  };

  const handleCreateCourse = async () => {
    // Validation
    if (!courseCode.trim() || !courseName.trim()) {
      Alert.alert("Error", "Course code and name are required");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Course description is required");
      return;
    }

    if (!facultyId) {
      Alert.alert("Error", "Please select faculty in charge");
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select course start and end dates");
      return;
    }

    if (sessionDays.length === 0) {
      Alert.alert("Error", "Please select at least one session day");
      return;
    }

    if (!sessionStartTime || !sessionEndTime) {
      Alert.alert("Error", "Please set session start and end times");
      return;
    }

    try {
      setLoading(true);

      const courseData = {
        title: courseName.trim(),
        description: description.trim(),
        assigned_faculty_id: parseInt(facultyId),
        start_date: startDate,
        end_date: endDate,
        schedule_days: sessionDays.join(","),
        time_slot_start: sessionStartTime,
        time_slot_end: sessionEndTime,
      };

      await courseAPI.createCourse(courseData);

      Alert.alert("Success", "Course created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Create course error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to create course",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="book" size={28} color="#7d53f6" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Create New Course</Text>
            <Text style={styles.headerSubtitle}>
              Add course details and schedule
            </Text>
          </View>
        </View>

        {/* Course Code */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course Code *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., CS101"
            value={courseCode}
            onChangeText={setCourseCode}
            autoCapitalize="characters"
            placeholderTextColor="#b0bec5"
          />
          <Text style={styles.hint}>Unique identifier for this course</Text>
        </View>

        {/* Course Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Introduction to Programming"
            value={courseName}
            onChangeText={setCourseName}
            placeholderTextColor="#b0bec5"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detailed course description..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#b0bec5"
          />
        </View>

        {/* Faculty In Charge */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Faculty In Charge *</Text>
          <TouchableOpacity
            style={styles.facDropdownButton}
            onPress={() => setShowFacultyModal(true)}
          >
            <Ionicons name="person" size={20} color="#7d53f6" />
            <Text
              style={[
                styles.facDropdownText,
                !facultyId && styles.placeholderText,
              ]}
            >
              {facultyId
                ? faculty.find((f) => f.id.toString() === facultyId)?.name ||
                  "Select Faculty Member"
                : "Select Faculty Member"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
          {facultyId && (
            <Ionicons
              name="checkmark"
              size={18}
              color="#7d53f6"
              style={styles.facCheckmark}
            />
          )}
          <Text style={styles.hint}>
            Faculty member responsible for this course
          </Text>
        </View>

        {/* Faculty Modal Dropdown */}
        <Modal
          visible={showFacultyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFacultyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.facModalContent}>
              {/* Modal Header */}
              <View style={styles.facModalHeader}>
                <TouchableOpacity onPress={() => setShowFacultyModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.facModalTitle}>Select Faculty</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Faculty List */}
              <FlatList
                data={faculty}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.facListItem,
                      facultyId === item.id.toString() &&
                        styles.facListItemActive,
                    ]}
                    onPress={() => {
                      setFacultyId(item.id.toString());
                      setShowFacultyModal(false);
                    }}
                  >
                    <Ionicons name="person-circle" size={40} color="#7d53f6" />
                    <View style={styles.facItemContent}>
                      <Text
                        style={[
                          styles.facItemName,
                          facultyId === item.id.toString() &&
                            styles.facItemNameActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.facItemEmail}>{item.email}</Text>
                    </View>
                    {facultyId === item.id.toString() && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#7d53f6"
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Start Date & Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date *</Text>
          <TouchableOpacity
            style={styles.dateInputContainer}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#7d53f6" />
            <Text
              style={[styles.dateText, !startDate && styles.placeholderText]}
            >
              {startDate || "Select start date"}
            </Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={tempStartDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* End Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>End Date *</Text>
          <TouchableOpacity
            style={styles.dateInputContainer}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#7d53f6" />
            <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
              {endDate || "Select end date"}
            </Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={tempEndDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
              minimumDate={startDate ? new Date(startDate) : new Date()}
            />
          )}
        </View>

        {/* Session Days */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Session Days *</Text>
          <Text style={styles.subLabel}>Select days when course meets</Text>
          <View style={styles.dayGrid}>
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = sessionDays.includes(day.value);
              return (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonActive,
                  ]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextActive,
                    ]}
                  >
                    {day.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#fff"
                      style={styles.dayCheckmark}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Session Times - Start & End */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Session Times *</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeFlex}>
              <Text style={styles.timeLabel}>Start</Text>
              <TouchableOpacity
                style={styles.timeInputContainer}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="timer" size={18} color="#7d53f6" />
                <Text
                  style={[
                    styles.timeInputText,
                    !sessionStartTime && styles.placeholderText,
                  ]}
                >
                  {sessionStartTime || "00:00"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeFlex}>
              <Text style={styles.timeLabel}>End</Text>
              <TouchableOpacity
                style={styles.timeInputContainer}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Ionicons name="timer" size={18} color="#7d53f6" />
                <Text
                  style={[
                    styles.timeInputText,
                    !sessionEndTime && styles.placeholderText,
                  ]}
                >
                  {sessionEndTime || "00:00"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartTimePicker && (
            <DateTimePicker
              value={tempStartTime}
              mode="time"
              display="default"
              onChange={onStartTimeChange}
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={tempEndTime}
              mode="time"
              display="default"
              onChange={onEndTimeChange}
            />
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreateCourse}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Course</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  form: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8eaf6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#757575",
    marginTop: 4,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 13,
    color: "#757575",
    marginTop: 6,
    fontStyle: "italic",
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#424242",
    marginBottom: 12,
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#fff",
    fontWeight: "500",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  facDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
    gap: 12,
  },
  facDropdownText: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  facCheckmark: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  facModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  facModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  facModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  facListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  facListItemActive: {
    backgroundColor: "#f5f3ff",
  },
  facItemContent: {
    flex: 1,
  },
  facItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  facItemNameActive: {
    color: "#7d53f6",
    fontWeight: "700",
  },
  facItemEmail: {
    fontSize: 13,
    color: "#757575",
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    minHeight: 48,
  },
  picker: {
    flex: 1,
    height: 48,
  },
  pickerLeftIcon: {
    marginRight: 10,
  },
  pickerRightIcon: {
    marginLeft: 8,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  placeholderText: {
    color: "#9e9e9e",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  dayButton: {
    width: "31%",
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 6,
  },
  dayButtonActive: {
    backgroundColor: "#7d53f6",
    borderColor: "#7d53f6",
  },
  dayButtonText: {
    fontSize: 12,
    color: "#424242",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  dayButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  dayCheckmark: {
    marginLeft: 3,
  },
  timeRow: {
    flexDirection: "row",
    gap: 14,
  },
  timeFlex: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#424242",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  timeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
    gap: 10,
  },
  timeInputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#7d53f6",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    gap: 10,
    shadowColor: "#7d53f6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  submitButtonDisabled: {
    backgroundColor: "#b0a0d4",
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default CreateCourseScreen;
