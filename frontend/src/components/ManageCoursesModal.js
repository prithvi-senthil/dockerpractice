import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";

const { width } = Dimensions.get("window");

const ManageCoursesModal = ({ visible, onClose }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchCourses();
    }
  }, [visible]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/courses");
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error("Fetch courses error:", error);
      Alert.alert("Error", "Failed to load courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const getFilteredCourses = () => {
    if (activeTab === "all") return courses;
    if (activeTab === "pending")
      return courses.filter((c) => c.approval_status === "PENDING");
    if (activeTab === "approved")
      return courses.filter((c) => c.approval_status === "APPROVED");
    if (activeTab === "rejected")
      return courses.filter((c) => c.approval_status === "REJECTED");
    return courses;
  };

  const handleApproveCourse = async (courseId) => {
    try {
      await api.post(`/admin/courses/${courseId}/approve`);
      Alert.alert("Success", "Course approved successfully");
      fetchCourses();
    } catch (error) {
      console.error("Approve course error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to approve course",
      );
    }
  };

  const handleRejectCourse = async (courseId) => {
    try {
      await api.post(`/admin/courses/${courseId}/reject`);
      Alert.alert("Success", "Course rejected successfully");
      fetchCourses();
    } catch (error) {
      console.error("Reject course error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to reject course",
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "#FF9800";
      case "APPROVED":
        return "#10B981";
      case "REJECTED":
        return "#EF4444";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PENDING":
        return "time-outline";
      case "APPROVED":
        return "checkmark-circle";
      case "REJECTED":
        return "close-circle";
      default:
        return "help-circle-outline";
    }
  };

  const filteredCourses = getFilteredCourses();

  const renderCourseCard = ({ item }) => (
    <View style={styles.courseCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.courseCode}>{item.code}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.approval_status) + "20" },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.approval_status)}
            size={14}
            color={getStatusColor(item.approval_status)}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.approval_status) },
            ]}
          >
            {item.approval_status}
          </Text>
        </View>
      </View>

      <View style={styles.courseDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={12} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {new Date(item.start_date).toLocaleDateString()} -{" "}
            {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>
        {item.faculty_name && (
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={12} color="#666" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.faculty_name}
            </Text>
          </View>
        )}
      </View>

      {item.total_students > 0 && (
        <View style={styles.enrollmentBadge}>
          <Ionicons name="people-outline" size={10} color="#fff" />
          <Text style={styles.enrollmentText}>
            {item.total_students} student{item.total_students !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {item.approval_status === "PENDING" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleRejectCourse(item.id)}
          >
            <Ionicons name="close" size={12} color="#fff" />
            <Text style={styles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleApproveCourse(item.id)}
          >
            <Ionicons name="checkmark" size={12} color="#fff" />
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={48} color="#ddd" />
      <Text style={styles.emptyTitle}>No Courses Found</Text>
      <Text style={styles.emptyText}>
        {activeTab === "all"
          ? "No courses available"
          : `No ${activeTab} courses`}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Courses</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7d53f6" />
            <Text style={styles.loadingText}>Loading courses...</Text>
          </View>
        ) : (
          /* Courses List */
          <FlatList
            data={filteredCourses}
            renderItem={renderCourseCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#7d53f6"]}
                tintColor="#7d53f6"
              />
            }
            ListEmptyComponent={renderEmptyState}
            scrollEnabled={true}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#7d53f6",
    backgroundColor: "#f0f0f0",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#7d53f6",
    fontWeight: "700",
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
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  courseCode: {
    fontSize: 11,
    color: "#7d53f6",
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    gap: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  description: {
    fontSize: 11,
    color: "#666",
    marginBottom: 8,
    lineHeight: 14,
  },
  courseDetails: {
    marginBottom: 8,
    gap: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 10,
    color: "#666",
    flex: 1,
  },
  enrollmentBadge: {
    flexDirection: "row",
    backgroundColor: "#7d53f6",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  enrollmentText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  approveBtn: {
    backgroundColor: "#10B981",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
});

export default ManageCoursesModal;
