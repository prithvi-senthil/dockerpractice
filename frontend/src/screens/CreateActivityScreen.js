import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const DAYS_OF_WEEK = [
  { key: "Monday", label: "Mon", short: "M" },
  { key: "Tuesday", label: "Tue", short: "T" },
  { key: "Wednesday", label: "Wed", short: "W" },
  { key: "Thursday", label: "Thu", short: "Th" },
  { key: "Friday", label: "Fri", short: "F" },
  { key: "Saturday", label: "Sat", short: "S" },
  { key: "Sunday", label: "Sun", short: "Su" },
];

const CreateActivityScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [maxStudents, setMaxStudents] = useState("60");
  const [assignedFacultyId, setAssignedFacultyId] = useState("");
  const [assignedFacultyName, setAssignedFacultyName] =
    useState("Select Faculty...");

  const [faculty, setFaculty] = useState([]);
  const [filteredFaculty, setFilteredFaculty] = useState([]);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [loadingFaculty, setLoadingFaculty] = useState(false);

  const [selectedDays, setSelectedDays] = useState([
    "Monday",
    "Wednesday",
    "Friday",
  ]);

  const [startTime, setStartTime] = useState(new Date(0, 0, 0, 9, 0));
  const [endTime, setEndTime] = useState(new Date(0, 0, 0, 10, 0));
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000),
  );
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoadingFaculty(true);
      const response = await api.get("/activities/faculty");
      const facultyList = response.data.faculty || response.data || [];
      setFaculty(facultyList);
      setFilteredFaculty(facultyList);
    } catch (error) {
      console.error("Fetch faculty error:", error);
      Alert.alert("Info", "You can manually enter faculty ID");
    } finally {
      setLoadingFaculty(false);
    }
  };

  const handleFacultySearch = (text) => {
    setFacultySearch(text);
    if (text.trim() === "") {
      setFilteredFaculty(faculty);
    } else {
      const filtered = faculty.filter(
        (f) =>
          f.name?.toLowerCase().includes(text.toLowerCase()) ||
          f.email?.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredFaculty(filtered);
    }
  };

  const selectFaculty = (fac) => {
    setAssignedFacultyId(fac.id);
    setAssignedFacultyName(fac.name);
    setShowFacultyModal(false);
    setFacultySearch("");
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formattedStartDate = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedEndDate = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleTimeChange = (event, selectedTime, isStart) => {
    if (Platform.OS === "android") {
      if (isStart) setShowStartTimePicker(false);
      else setShowEndTimePicker(false);
    }
    if (selectedTime) {
      if (isStart) setStartTime(selectedTime);
      else setEndTime(selectedTime);
    }
  };

  const handleDateChange = (event, selectedDate, isStart) => {
    if (Platform.OS === "android") {
      if (isStart) setShowStartDatePicker(false);
      else setShowEndDatePicker(false);
    }
    if (selectedDate) {
      if (isStart) setStartDate(selectedDate);
      else setEndDate(selectedDate);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !courseCode.trim() || !assignedFacultyId) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert("Error", "Please select at least one day of the week");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        course_code: courseCode.trim(),
        max_students: parseInt(maxStudents) || 60,
        assigned_faculty_id: parseInt(assignedFacultyId),
        schedule_days: selectedDays.join(","),
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      };

      await api.post("/activities/courses", payload);

      Alert.alert("Success", "Course created successfully!", [
        {
          text: "OK",
          onPress: () => {
            setTitle("");
            setCourseCode("");
            setDescription("");
            setMaxStudents("60");
            setAssignedFacultyId("");
            setAssignedFacultyName("Select Faculty...");
            setSelectedDays(["Monday", "Wednesday", "Friday"]);
            navigation.goBack();
          },
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Course Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Course Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Full Stack Development"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Course Code <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., CS401"
              value={courseCode}
              onChangeText={setCourseCode}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Course description..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Max Students</Text>
            <TextInput
              style={styles.input}
              placeholder="60"
              value={maxStudents}
              onChangeText={setMaxStudents}
              keyboardType="number-pad"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🏫 Faculty Assignment</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Assigned Faculty <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.facultyButton}
              onPress={() => setShowFacultyModal(true)}
            >
              <Ionicons
                name="person-circle-outline"
                size={20}
                color="#5B6CF6"
              />
              <Text
                style={[
                  styles.facultyButtonText,
                  !assignedFacultyId && styles.facultyButtonPlaceholder,
                ]}
              >
                {assignedFacultyName}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            <Text style={styles.hint}>
              Select a faculty member to assign to this course
            </Text>
          </View>
        </View>

        <Modal visible={showFacultyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Faculty</Text>
                <TouchableOpacity onPress={() => setShowFacultyModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search faculty..."
                value={facultySearch}
                onChangeText={handleFacultySearch}
                placeholderTextColor="#999"
              />

              <FlatList
                data={filteredFaculty}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.facultyRow}
                    onPress={() => selectFaculty(item)}
                  >
                    <View style={styles.facultyAvatar}>
                      <Text style={styles.avatarText}>
                        {item.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.facultyInfo}>
                      <Text style={styles.facultyName}>{item.name}</Text>
                      <Text style={styles.facultyEmail}>{item.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyText}>No faculty found</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Schedule</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Days of Week <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.dayChip,
                    selectedDays.includes(day.key) && styles.dayChipSelected,
                  ]}
                  onPress={() => toggleDay(day.key)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      selectedDays.includes(day.key) &&
                        styles.dayChipTextSelected,
                    ]}
                  >
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#5B6CF6" />
                <Text style={styles.timeButtonText}>
                  {formatTime(startTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#5B6CF6" />
                <Text style={styles.timeButtonText}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) =>
                handleTimeChange(event, selectedTime, true)
              }
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) =>
                handleTimeChange(event, selectedTime, false)
              }
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📆 Course Duration</Text>

          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#5B6CF6" />
                <Text style={styles.dateButtonText}>{formattedStartDate}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#5B6CF6" />
                <Text style={styles.dateButtonText}>{formattedEndDate}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) =>
                handleDateChange(event, selectedDate, true)
              }
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) =>
                handleDateChange(event, selectedDate, false)
              }
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
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
    backgroundColor: "#F8F9FA",
  },
  form: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#F44336",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    fontStyle: "italic",
  },
  facultyButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    gap: 10,
  },
  facultyButtonText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  facultyButtonPlaceholder: {
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f8f8f8",
  },
  facultyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  facultyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8EAF6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B6CF6",
  },
  facultyInfo: {
    flex: 1,
  },
  facultyName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  facultyEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  emptyList: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  dayChip: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  dayChipSelected: {
    borderColor: "#5B6CF6",
    backgroundColor: "#E8EAF6",
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  dayChipTextSelected: {
    color: "#5B6CF6",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    gap: 10,
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    gap: 10,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#5B6CF6",
    borderRadius: 10,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#90CAF9",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default CreateActivityScreen;
