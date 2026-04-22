import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const { width } = Dimensions.get("window");

const AdminCoursesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = user?.user_type === "admin";
  const isHOD = user?.user_type === "hod";
  const apiBase = isHOD ? "/hod/my-courses" : "/admin/courses";

  useFocusEffect(
    React.useCallback(() => {
      fetchCourses();
      return () => {};
    }, []),
  );

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get(apiBase);
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
      return courses.filter((c) => c.assignment_status === "pending");
    if (activeTab === "approved")
      return courses.filter((c) => c.assignment_status === "accepted");
    if (activeTab === "rejected")
      return courses.filter((c) => c.assignment_status === "rejected");
    return courses;
  };

  const handleDeleteCourse = (courseId, courseTitle) => {
    Alert.alert(
      "Archive Course",
      `Archive "${courseTitle}"? This course will no longer be visible to students.`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Archive",
          onPress: async () => {
            try {
              setDeletingId(courseId);
              const endpoint = isHOD
                ? `/hod/courses/${courseId}`
                : `/admin/courses/${courseId}`;
              await api.delete(endpoint);
              Alert.alert("Success", "Course archived successfully");
              fetchCourses();
            } catch (error) {
              console.error("Archive course error:", error);
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to archive course",
              );
            } finally {
              setDeletingId(null);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleAcceptCourse = async (courseId, courseTitle) => {
    Alert.alert("Accept Course", `Accept assignment for "${courseTitle}"?`, [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Accept",
        onPress: async () => {
          try {
            setDeletingId(courseId);
            const endpoint = `/hod/courses/${courseId}/accept`;
            await api.post(endpoint);
            Alert.alert("Success", "Course accepted successfully");
            fetchCourses();
          } catch (error) {
            console.error("Accept course error:", error);
            Alert.alert(
              "Error",
              error.response?.data?.error || "Failed to accept course",
            );
          } finally {
            setDeletingId(null);
          }
        },
        style: "default",
      },
    ]);
  };

  const handleRejectCourse = async (courseId, courseTitle) => {
    Alert.alert("Reject Course", `Reject assignment for "${courseTitle}"?`, [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Reject",
        onPress: async () => {
          try {
            setDeletingId(courseId);
            const endpoint = `/hod/courses/${courseId}/reject`;
            await api.post(endpoint);
            Alert.alert("Success", "Course rejected successfully");
            fetchCourses();
          } catch (error) {
            console.error("Reject course error:", error);
            Alert.alert(
              "Error",
              error.response?.data?.error || "Failed to reject course",
            );
          } finally {
            setDeletingId(null);
          }
        },
        style: "destructive",
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#FF9800";
      case "accepted":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "accepted":
        return "checkmark-circle";
      case "rejected":
        return "close-circle";
      default:
        return "help-circle-outline";
    }
  };

  const filteredCourses = getFilteredCourses();

  const renderCourseCard = ({ item }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() =>
        navigation.navigate("AdminCourseDetail", { courseId: item.id })
      }
      activeOpacity={0.7}
    >
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
            { backgroundColor: getStatusColor(item.assignment_status) + "20" },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.assignment_status)}
            size={14}
            color={getStatusColor(item.assignment_status)}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.assignment_status) },
            ]}
          >
            {item.assignment_status}
          </Text>
        </View>
      </View>

      <View style={styles.courseDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {new Date(item.start_date).toLocaleDateString()} -{" "}
            {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>
        {item.faculty_name && (
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={14} color="#666" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.faculty_name}
            </Text>
          </View>
        )}
        {item.department_name && (
          <View style={styles.detailItem}>
            <Ionicons name="folder-outline" size={14} color="#666" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.department_name}
            </Text>
          </View>
        )}
      </View>

      {item.total_students > 0 && (
        <View style={styles.enrollmentBadge}>
          <Ionicons name="people-outline" size={12} color="#fff" />
          <Text style={styles.enrollmentText}>
            {item.total_students} student{item.total_students !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {/* For HOD: Accept/Reject if assigned to them and pending */}
      {isHOD &&
        item.assignment_status === "pending" &&
        item.assigned_faculty_id === user?.id && (
          <View style={styles.actionBtnGroup}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleAcceptCourse(item.id, item.title)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.actionBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRejectCourse(item.id, item.title)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      {/* For Admin/HOD: Archive if created and non-pending */}
      {item.assignment_status !== "pending" && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.archiveBtn]}
          onPress={() => handleDeleteCourse(item.id, item.title)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="archive-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Archive</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={64} color="#ddd" />
      <Text style={styles.emptyTitle}>No Courses Found</Text>
      <Text style={styles.emptyText}>
        {activeTab === "all"
          ? "Create a new course to get started"
          : `No ${activeTab} courses`}
      </Text>
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => navigation.navigate("CreateCourse")}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.createBtnText}>Create Course</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7d53f6" />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              {tab.id === "all" && ` (${courses.length})`}
              {tab.id === "pending" &&
                ` (${courses.filter((c) => c.approval_status === "pending").length})`}
              {tab.id === "approved" &&
                ` (${courses.filter((c) => c.approval_status === "accepted").length})`}
              {tab.id === "rejected" &&
                ` (${courses.filter((c) => c.approval_status === "rejected").length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Create Course Button */}
      <TouchableOpacity
        style={styles.createCourseBtn}
        onPress={() => navigation.navigate("CreateCourse")}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createCourseBtnText}>Create New Course</Text>
      </TouchableOpacity>

      {/* Courses List */}
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
  createCourseBtn: {
    flexDirection: "row",
    backgroundColor: "#7d53f6",
    marginHorizontal: 12,
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#7d53f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createCourseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  courseCode: {
    fontSize: 12,
    color: "#7d53f6",
    fontWeight: "600",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
    lineHeight: 16,
  },
  courseDetails: {
    marginBottom: 10,
    gap: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: "#666",
    flex: 1,
  },
  enrollmentBadge: {
    flexDirection: "row",
    backgroundColor: "#7d53f6",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  enrollmentText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtnGroup: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: "#10B981",
  },
  approveBtn: {
    backgroundColor: "#10B981",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  archiveBtn: {
    backgroundColor: "#F59E0B",
  },
  actionBtnText: {
    fontSize: 12,
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
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  createBtn: {
    flexDirection: "row",
    backgroundColor: "#7d53f6",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default AdminCoursesScreen;
