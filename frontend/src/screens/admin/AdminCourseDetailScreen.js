import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import DateTimePicker from "@react-native-community/datetimepicker";

const AdminCourseDetailScreen = ({ route, navigation }) => {
  const { courseId } = route.params;

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return "N/A";
    const match = String(timeString).match(/(\d{1,2}):(\d{2})/);
    if (!match) return "N/A";
    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [editData, setEditData] = useState({});
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  useFocusEffect(
    React.useCallback(() => {
      fetchCourseDetails();
      return () => {};
    }, [courseId]),
  );

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/courses/${courseId}`);
      setCourse(response.data);
      setEditData({
        title: response.data.title,
        start_date: response.data.start_date,
        end_date: response.data.end_date,
      });
      setSelectedFacultyId(response.data.assigned_faculty_id);
    } catch (error) {
      console.error("Fetch course details error:", error);
      Alert.alert("Error", "Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculties = async () => {
    try {
      const response = await api.get("/admin/users");
      // Extract faculty users from the grouped response
      const facultyList = response.data.users_by_role?.faculty?.users || [];
      setFaculties(facultyList);
    } catch (error) {
      console.error("Fetch faculties error:", error);
      Alert.alert("Error", "Failed to load faculty list");
    }
  };

  const handleEditPress = () => {
    fetchFaculties();
    // Initialize temp date/time values from editData
    if (editData.start_date) {
      setTempStartDate(new Date(editData.start_date));
    }
    if (editData.end_date) {
      setTempEndDate(new Date(editData.end_date));
    }
    if (editData.time_slot_start) {
      const [hours, minutes] = editData.time_slot_start.split(":");
      setTempStartTime(
        new Date(2000, 0, 1, parseInt(hours), parseInt(minutes)),
      );
    }
    if (editData.time_slot_end) {
      const [hours, minutes] = editData.time_slot_end.split(":");
      setTempEndTime(new Date(2000, 0, 1, parseInt(hours), parseInt(minutes)));
    }
    setEditModalVisible(true);
  };

  const handleReassignPress = () => {
    fetchFaculties();
    setReassignModalVisible(true);
  };

  const handleSaveEdit = async () => {
    // Validate dates
    if (editData.start_date && editData.end_date) {
      const startDate = new Date(editData.start_date);
      const endDate = new Date(editData.end_date);

      if (startDate >= endDate) {
        Alert.alert("Error", "Start date must be before end date");
        return;
      }

      // Check for conflicts in faculty schedule
      if (course.assigned_faculty_id) {
        try {
          const conflictCheck = await api.post(
            `/admin/check-faculty-conflicts`,
            {
              faculty_id: course.assigned_faculty_id,
              start_date: editData.start_date,
              end_date: editData.end_date,
              exclude_course_id: courseId,
            },
          );

          if (
            conflictCheck.data.conflicts &&
            conflictCheck.data.conflicts.length > 0
          ) {
            const conflictList = conflictCheck.data.conflicts
              .map((c) => `- ${c.title}`)
              .join("\n");
            Alert.alert(
              "Schedule Conflict Warning",
              `Faculty ${course.faculty_name} has conflicts:\n${conflictList}\n\nDo you want to proceed?`,
              [
                { text: "Cancel", onPress: () => {}, style: "cancel" },
                {
                  text: "Proceed",
                  onPress: async () => {
                    await saveEditData();
                  },
                },
              ],
            );
            return;
          }
        } catch (error) {
          console.error("Conflict check error:", error);
          // Continue with save if conflict check fails
        }
      }
    }

    await saveEditData();
  };

  const saveEditData = async () => {
    try {
      setActionLoading(true);
      await api.put(`/admin/courses/${courseId}`, editData);
      Alert.alert("Success", "Course updated successfully");
      setEditModalVisible(false);
      fetchCourseDetails();
    } catch (error) {
      console.error("Update course error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to update course",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassignFaculty = async () => {
    try {
      setActionLoading(true);
      await api.post(`/hod/courses/${courseId}/assign-faculty`, {
        faculty_id: selectedFacultyId,
      });
      // Send notification to newly assigned faculty
      await api.post("/api/notifications/send", {
        recipient_id: selectedFacultyId,
        type: "FACULTY_ASSIGNMENT",
        title: "Course Reassigned",
        message: `You have been assigned to course: ${course.title}. Please accept or reject this assignment.`,
        course_id: courseId,
        action_required: true,
      });
      Alert.alert("Success", "Faculty reassignment notification sent");
      setReassignModalVisible(false);
      fetchCourseDetails();
    } catch (error) {
      console.error("Reassign faculty error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to reassign faculty",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseCourse = async () => {
    Alert.alert(
      "Pause Course",
      "Are you sure you want to pause this course? All students will be notified.",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Pause",
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.put(`/admin/courses/${courseId}`, {
                status: "inactive",
              });

              // Notify all students
              if (course.total_students > 0) {
                await api.post("/api/notifications/broadcast", {
                  course_id: courseId,
                  type: "COURSE_PAUSED",
                  title: "Course Paused",
                  message: `Course ${course.title} has been paused. You cannot access materials or submit assignments.`,
                });
              }

              Alert.alert("Success", "Course paused and students notified");
              fetchCourseDetails();
            } catch (error) {
              console.error("Pause course error:", error);
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to pause course",
              );
            } finally {
              setActionLoading(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleResumeCourse = async () => {
    try {
      setActionLoading(true);
      await api.put(`/admin/courses/${courseId}`, { status: "active" });

      // Notify all students
      if (course.total_students > 0) {
        await api.post("/api/notifications/broadcast", {
          course_id: courseId,
          type: "COURSE_RESUMED",
          title: "Course Resumed",
          message: `Course ${course.title} is now active again. You can access materials and submit assignments.`,
        });
      }

      Alert.alert("Success", "Course resumed and students notified");
      fetchCourseDetails();
    } catch (error) {
      console.error("Resume course error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to resume course",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setTempStartDate(selectedDate);
      const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      setEditData({ ...editData, start_date: formattedDate });
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setTempEndDate(selectedDate);
      const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      setEditData({ ...editData, end_date: formattedDate });
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setTempStartTime(selectedTime);
      const formattedTime = `${String(selectedTime.getHours()).padStart(2, "0")}:${String(selectedTime.getMinutes()).padStart(2, "0")}:00`;
      setEditData({ ...editData, time_slot_start: formattedTime });
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setTempEndTime(selectedTime);
      const formattedTime = `${String(selectedTime.getHours()).padStart(2, "0")}:${String(selectedTime.getMinutes()).padStart(2, "0")}:00`;
      setEditData({ ...editData, time_slot_end: formattedTime });
    }
  };

  const handleDeleteCourse = () => {
    Alert.alert(
      "Delete Course",
      "Are you sure you want to delete this course? This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.delete(`/admin/courses/${courseId}`);
              Alert.alert("Success", "Course deleted successfully");
              navigation.goBack();
            } catch (error) {
              console.error("Delete course error:", error);
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete course",
              );
            } finally {
              setActionLoading(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7d53f6" />
        <Text style={styles.loadingText}>Loading course details...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ddd" />
        <Text style={styles.loadingText}>Course not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Course Info Card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseCode}>{course.code}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    course.approval_status === "pending"
                      ? "#FF9800"
                      : course.approval_status === "accepted"
                        ? "#10B981"
                        : "#EF4444" + "20",
                },
              ]}
            >
              <Text
                style={{
                  color:
                    course.approval_status === "pending"
                      ? "#FF9800"
                      : course.approval_status === "accepted"
                        ? "#10B981"
                        : "#EF4444",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {course.approval_status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Course Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <Ionicons name="code-outline" size={18} color="#7d53f6" />
              <Text style={styles.detailLabel}>Course ID</Text>
              <Text style={styles.detailValue}>{course.code}</Text>
            </View>
            <View style={styles.detailBox}>
              <Ionicons name="people-outline" size={18} color="#7d53f6" />
              <Text style={styles.detailLabel}>Students</Text>
              <Text style={styles.detailValue}>
                {course.total_students || 0}
              </Text>
            </View>
            <View style={styles.detailBox}>
              <Ionicons name="calendar-outline" size={18} color="#7d53f6" />
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>
                {new Date(course.start_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailBox}>
              <Ionicons name="calendar-outline" size={18} color="#7d53f6" />
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailValue}>
                {new Date(course.end_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailBox}>
              <Ionicons name="time-outline" size={18} color="#7d53f6" />
              <Text style={styles.detailLabel}>Start Time</Text>
              <Text style={styles.detailValue}>
                {formatTimeDisplay(course.time_slot_start) || "Not set"}
              </Text>
            </View>
            <View style={styles.detailBox}>
              <Ionicons name="time-outline" size={18} color="#7d53f6" />
              <Text style={styles.detailLabel}>End Time</Text>
              <Text style={styles.detailValue}>
                {formatTimeDisplay(course.time_slot_end) || "Not set"}
              </Text>
            </View>
            <View style={styles.detailBox}>
              <Ionicons name="person-outline" size={18} color="#7d53f6" />
              <Text style={styles.detailLabel}>Faculty</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {course.faculty_name || "Not assigned"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {course.status === "inactive" && (
            <View style={styles.pausedBanner}>
              <Ionicons name="pause-circle" size={20} color="#FF9800" />
              <Text style={styles.pausedText}>
                This course is paused. Most actions are disabled.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.editBtn,
              course.status === "inactive" && styles.disabledBtn,
            ]}
            onPress={handleEditPress}
            disabled={actionLoading || course.status === "inactive"}
          >
            <Ionicons
              name="pencil-outline"
              size={18}
              color={course.status === "inactive" ? "#999" : "#fff"}
            />
            <Text
              style={[
                styles.actionBtnText,
                course.status === "inactive" && { color: "#999" },
              ]}
            >
              Edit Course
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.reassignBtn,
              course.status === "inactive" && styles.disabledBtn,
            ]}
            onPress={handleReassignPress}
            disabled={actionLoading || course.status === "inactive"}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={18}
              color={course.status === "inactive" ? "#999" : "#fff"}
            />
            <Text
              style={[
                styles.actionBtnText,
                course.status === "inactive" && { color: "#999" },
              ]}
            >
              Reassign Faculty
            </Text>
          </TouchableOpacity>

          {course.status === "active" ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.pauseBtn]}
              onPress={handlePauseCourse}
              disabled={actionLoading}
            >
              <Ionicons name="pause-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Pause Course</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.resumeBtn]}
              onPress={handleResumeCourse}
              disabled={actionLoading}
            >
              <Ionicons name="play-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Resume Course</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteBtn]}
            onPress={handleDeleteCourse}
            disabled={actionLoading}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Delete Course</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Course</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Course Title</Text>
              <TextInput
                style={styles.input}
                value={editData.title}
                onChangeText={(val) => setEditData({ ...editData, title: val })}
                placeholder="Enter course title"
              />

              <Text style={styles.fieldLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#7d53f6" />
                <Text style={styles.dateButtonText}>
                  {editData.start_date
                    ? new Date(editData.start_date).toLocaleDateString()
                    : "Select start date"}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                />
              )}

              <Text style={styles.fieldLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color="#7d53f6" />
                <Text style={styles.dateButtonText}>
                  {formatTimeDisplay(editData.time_slot_start) ||
                    "Select start time"}
                </Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={tempStartTime}
                  mode="time"
                  display="default"
                  onChange={onStartTimeChange}
                />
              )}

              <Text style={styles.fieldLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#7d53f6" />
                <Text style={styles.dateButtonText}>
                  {editData.end_date
                    ? new Date(editData.end_date).toLocaleDateString()
                    : "Select end date"}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display="default"
                  onChange={onEndDateChange}
                />
              )}

              <Text style={styles.fieldLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color="#7d53f6" />
                <Text style={styles.dateButtonText}>
                  {formatTimeDisplay(editData.time_slot_end) ||
                    "Select end time"}
                </Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={tempEndTime}
                  mode="time"
                  display="default"
                  onChange={onEndTimeChange}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveEdit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reassign Faculty Modal */}
      <Modal
        visible={reassignModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReassignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Faculty</Text>
              <TouchableOpacity
                onPress={() => setReassignModalVisible(false)}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={faculties}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.facultyItem,
                    selectedFacultyId === item.id && styles.facultyItemSelected,
                  ]}
                  onPress={() => setSelectedFacultyId(item.id)}
                >
                  <View style={styles.facultyInfo}>
                    <Text style={styles.facultyName}>{item.name}</Text>
                    <Text style={styles.facultyEmail}>{item.email}</Text>
                  </View>
                  {selectedFacultyId === item.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#7d53f6"
                    />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={true}
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setReassignModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleReassignFaculty}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Reassign
                  </Text>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    backgroundColor: "#7d53f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 6,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 4,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  editBtn: {
    backgroundColor: "#2196F3",
  },
  reassignBtn: {
    backgroundColor: "#9C27B0",
  },
  pauseBtn: {
    backgroundColor: "#FF9800",
  },
  resumeBtn: {
    backgroundColor: "#10B981",
  },
  deleteBtn: {
    backgroundColor: "#EF4444",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  pausedBanner: {
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pausedText: {
    fontSize: 12,
    color: "#FF9800",
    fontWeight: "600",
    flex: 1,
  },
  disabledBtn: {
    opacity: 0.5,
    backgroundColor: "#ccc",
  },
  dateButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
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
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  facultyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  facultyItemSelected: {
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 12,
    borderRadius: 8,
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
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#e9ecef",
  },
  saveBtn: {
    backgroundColor: "#7d53f6",
  },
  modalBtnText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  dateTimeModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
    paddingTop: 20,
  },
  dateTimeContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  calendar: {
    marginBottom: 20,
  },
  weekdaysHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    width: "14.28%",
    textAlign: "center",
  },
  calendarWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDaySelected: {
    backgroundColor: "#7d53f6",
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  timeSelector: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  timeInputs: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  timeInput: {
    width: 80,
  },
  timeUnitLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    marginBottom: 6,
  },
  timeField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#7d53f6",
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
});

export default AdminCourseDetailScreen;
