import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const StudentEnrollmentScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [acceptedCourses, setAcceptedCourses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      fetchAcceptedCourses();
      fetchAllStudents();

      // If courseId is passed from Calendar, auto-open enrollment modal
      if (route?.params?.courseId) {
        const course = acceptedCourses.find(
          (c) => c.id === route.params.courseId,
        );
        if (course) {
          openEnrollModal(course);
        }
      }
    }, [route?.params?.courseId]),
  );

  const fetchAcceptedCourses = async () => {
    try {
      const response = await api.get("/activities/courses");
      // Filter only accepted courses
      const accepted = response.data.courses.filter(
        (c) => c.assignment_status === "accepted",
      );
      setAcceptedCourses(accepted);
    } catch (error) {
      console.error("Fetch courses error:", error);
      Alert.alert("Error", "Failed to load courses");
    }
  };

  const fetchAllStudents = async () => {
    try {
      const response = await api.get("/activities/students");
      setAllStudents(response.data.students || []);
    } catch (error) {
      console.error("Fetch students error:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAcceptedCourses();
    await fetchAllStudents();
    setRefreshing(false);
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

  const openEnrollModal = (course) => {
    setSelectedCourse(course);
    setSelectedStudents([]);
    setSearchQuery("");
    setShowEnrollModal(true);
  };

  const toggleStudentSelection = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleEnrollStudents = async () => {
    if (selectedStudents.length === 0) {
      Alert.alert("Error", "Please select at least one student");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/activities/courses/${selectedCourse.id}/students`, {
        student_ids: selectedStudents,
      });

      Alert.alert(
        "Success",
        `${selectedStudents.length} student(s) enrolled successfully`,
      );
      setShowEnrollModal(false);
      fetchAcceptedCourses();
    } catch (error) {
      console.error("Enroll students error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to enroll students",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = allStudents.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderCourseCard = ({ item }) => {
    const startDate = new Date(item.start_date).toLocaleDateString();
    const endDate = new Date(item.end_date).toLocaleDateString();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courseTitle}>{item.title}</Text>
            <Text style={styles.facultyName}>Faculty: {item.faculty_name}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>ACCEPTED</Text>
          </View>
        </View>

        <View style={styles.courseDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#7d53f6" />
            <Text style={styles.detailText}>
              {startDate} to {endDate}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#7d53f6" />
            <Text style={styles.detailText}>
              {formatTime(item.time_slot_start)} -{" "}
              {formatTime(item.time_slot_end)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people" size={16} color="#7d53f6" />
            <Text style={styles.detailText}>
              Enrolled: {item.enrolled_count} / {item.max_students}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.enrollButton}
          onPress={() => openEnrollModal(item)}
        >
          <MaterialCommunityIcons name="plus-circle" size={18} color="#fff" />
          <Text style={styles.enrollButtonText}>Add Students</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStudentItem = ({ item }) => {
    const isSelected = selectedStudents.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.studentItem, isSelected && styles.studentItemSelected]}
        onPress={() => toggleStudentSelection(item.id)}
      >
        <View style={styles.studentCheckbox}>
          {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-done-circle" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Accepted Courses</Text>
      <Text style={styles.emptySubtitle}>
        Courses will appear here after faculty accepts them
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#7d53f6" />
        </View>
      ) : (
        <FlatList
          data={acceptedCourses}
          renderItem={renderCourseCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Enrollment Modal */}
      <Modal
        visible={showEnrollModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEnrollModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCourse?.title || "Enroll Students"}
              </Text>
              <TouchableOpacity onPress={() => setShowEnrollModal(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.selectedCount}>
              <Text style={styles.selectedCountText}>
                {selectedStudents.length} student(s) selected
              </Text>
            </View>

            <FlatList
              data={filteredStudents}
              renderItem={renderStudentItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.studentsList}
            />

            <View style={styles.modalBottom}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEnrollModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  selectedStudents.length === 0 && styles.disabledButton,
                ]}
                onPress={handleEnrollStudents}
                disabled={selectedStudents.length === 0}
              >
                <Text style={styles.confirmButtonText}>Enroll</Text>
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
    backgroundColor: "#f8f9fa",
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  facultyName: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    backgroundColor: "#d4edda",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#28a745",
  },
  courseDetails: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  enrollButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7d53f6",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  enrollButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1a1a1a",
  },
  selectedCount: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectedCountText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  studentsList: {
    maxHeight: 350,
    paddingHorizontal: 16,
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  studentItemSelected: {
    backgroundColor: "#e8d5f2",
  },
  studentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#7d53f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  studentEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  modalBottom: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#1a1a1a",
    fontWeight: "600",
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: "#7d53f6",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default StudentEnrollmentScreen;
