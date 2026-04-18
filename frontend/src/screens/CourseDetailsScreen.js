import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { courseAPI, userAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const CourseDetailsScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { courseId } = route.params || {};

  const [course, setCourse] = useState(null);
  const [faculty, setFaculty] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch current user ID
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        if (user?.id) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error("Error getting user ID:", error);
      }
    };
    getCurrentUserId();
  }, [user]);

  // Fetch course details
  useFocusEffect(
    React.useCallback(() => {
      if (courseId) {
        fetchCourseDetails();
      } else {
        Alert.alert("Error", "Course ID not found");
        navigation.goBack();
      }
    }, [courseId]),
  );

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getCourseById(courseId);

      if (response?.course) {
        setCourse(response.course);
        setFaculty(response.faculty || null);
        setEnrolledStudents(response.enrolled_students || []);
      } else {
        Alert.alert("Error", "Course not found");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Fetch course details error:", error);
      Alert.alert("Error", "Failed to load course details");
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourseDetails();
  };

  const handleAcceptCourse = async () => {
    try {
      setActionLoading(true);
      const response = await courseAPI.acceptCourse(courseId);

      Alert.alert(
        "Success",
        response?.message || "Course accepted successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error("Accept course error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to accept course",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCourse = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejection");
      return;
    }

    try {
      setActionLoading(true);
      const response = await courseAPI.rejectCourse(courseId, {
        reason: rejectReason.trim(),
      });

      Alert.alert(
        "Success",
        response?.message || "Course rejected successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              setRejectModalVisible(false);
              setRejectReason("");
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error("Reject course error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to reject course",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayName = (dayValue) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days[dayValue - 1] || "";
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: "#10B981",
      PENDING: "#F59E0B",
      pending: "#F59E0B",
      accepted: "#10B981",
      rejected: "#DC2626",
      COMPLETED: "#6B7280",
      CANCELLED: "#DC2626",
    };
    return colors[status] || "#666";
  };

  const getStatusDisplay = (course) => {
    // Show assignment_status (pending/accepted/rejected) if available
    if (course?.assignment_status) {
      return course.assignment_status.toUpperCase();
    }
    // Fallback to status field
    return course?.status || "UNKNOWN";
  };

  const isFaculty = user?.user_type === "faculty";
  const isAssignedFaculty = course && faculty && faculty.id === currentUserId;
  const isCreator = course?.created_by === currentUserId;
  const canAcceptReject =
    isAssignedFaculty && course?.assignment_status === "pending" && !isCreator;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7d53f6" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Course not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 200 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7d53f6"]}
            tintColor="#7d53f6"
          />
        }
      >
        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor(
                  course?.assignment_status || course?.status,
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>{getStatusDisplay(course)}</Text>
          </View>
        </View>

        {/* Course Header */}
        <View style={styles.headerCard}>
          <Ionicons name="book" size={40} color="#7d53f6" />
          <Text style={styles.courseCode}>{course.title || course.code}</Text>
          <Text style={styles.courseCode2}>{course.code}</Text>
        </View>

        {/* Course Description */}
        {course.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{course.description}</Text>
          </View>
        )}

        {/* Course Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Information</Text>

          {/* Faculty In Charge */}
          {faculty && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="person-circle" size={20} color="#7d53f6" />
                <Text style={styles.infoLabel}>Faculty In Charge</Text>
              </View>
              <View>
                <Text style={styles.infoValue}>{faculty.name}</Text>
                {faculty.email && (
                  <Text style={styles.infoSubValue}>{faculty.email}</Text>
                )}
              </View>
            </View>
          )}

          {/* Dates */}
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="calendar" size={20} color="#7d53f6" />
              <Text style={styles.infoLabel}>Start Date</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatDate(course.start_date)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="calendar" size={20} color="#7d53f6" />
              <Text style={styles.infoLabel}>End Date</Text>
            </View>
            <Text style={styles.infoValue}>{formatDate(course.end_date)}</Text>
          </View>
        </View>

        {/* Session Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Schedule</Text>

          {/* Days */}
          {course.schedule_days && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="calendar-outline" size={20} color="#7d53f6" />
                <Text style={styles.infoLabel}>Session Days</Text>
              </View>
              <View style={styles.daysContainer}>
                {course.schedule_days.split(",").map((day, index) => (
                  <View key={index} style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>
                      {getDayName(parseInt(day.trim()))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Time */}
          <View style={styles.timeRow}>
            <View style={[styles.infoRow, { flex: 1 }]}>
              <View style={styles.infoLeft}>
                <Ionicons name="time" size={20} color="#10B981" />
                <Text style={styles.infoLabel}>Start Time</Text>
              </View>
              <Text style={styles.infoValue}>
                {formatTime(course.time_slot_start)}
              </Text>
            </View>

            <View style={[styles.infoRow, { flex: 1 }]}>
              <View style={styles.infoLeft}>
                <Ionicons name="time" size={20} color="#EF4444" />
                <Text style={styles.infoLabel}>End Time</Text>
              </View>
              <Text style={styles.infoValue}>
                {formatTime(course.time_slot_end)}
              </Text>
            </View>
          </View>
        </View>

        {/* Enrolled Students */}
        {enrolledStudents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Enrolled Students ({enrolledStudents.length})
            </Text>

            {enrolledStudents.map((student, index) => (
              <View key={index} style={styles.studentCard}>
                <View style={styles.studentInfo}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {student.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.studentDetails}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                  </View>
                </View>
                {student.enrollment_date && (
                  <Text style={styles.enrollmentDate}>
                    Enrolled: {formatDate(student.enrollment_date)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Course Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Statistics</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="#7d53f6" />
              <Text style={styles.statValue}>{enrolledStudents.length}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#10B981" />
              <Text style={styles.statValue}>
                {course.schedule_days
                  ? course.schedule_days.split(",").length
                  : 0}
              </Text>
              <Text style={styles.statLabel}>Days/Week</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Only show if faculty and course is pending */}
      {canAcceptReject && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAcceptCourse}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Accept Course</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => setRejectModalVisible(true)}
            disabled={actionLoading}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Reject Course</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Course</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Reason for Rejection *</Text>
            <Text style={styles.modalHint}>
              Please provide a detailed reason
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectReason("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonReject]}
                onPress={handleRejectCourse}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Submit
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
  },
  statusBadgeContainer: {
    padding: 16,
    alignItems: "flex-start",
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  headerCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseCode: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 12,
    textAlign: "center",
  },
  courseCode2: {
    fontSize: 16,
    color: "#7d53f6",
    fontWeight: "600",
    marginTop: 8,
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    width: 120,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  infoSubValue: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  dayBadge: {
    backgroundColor: "#f0f0ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#7d53f6",
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7d53f6",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7d53f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  studentDetails: {
    flex: 1,
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
  enrollmentDate: {
    fontSize: 11,
    color: "#bbb",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#7d53f6",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontWeight: "500",
  },
  actionSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
    marginBottom: 20,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonReject: {
    backgroundColor: "#EF4444",
  },
  modalButtonText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#1a1a1a",
  },
});

export default CourseDetailsScreen;
