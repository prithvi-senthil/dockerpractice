import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import { canUserViewAdminPanel } from "../../utils/adminAccess";
import AdminUsersPanel from "../admin/AdminUsersPanel";

const { width } = Dimensions.get("window");

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCourses: 0,
    upcomingSessions: 0,
    presentDays: 0,
    absentDays: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
  });
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [showAdminUsersModal, setShowAdminUsersModal] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchDashboardData();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const hasAccess = await canUserViewAdminPanel(user);
      setCanViewAdmin(hasAccess);
      console.log("✅ Admin access check:", hasAccess);
    } catch (error) {
      console.error("❌ Admin access check error:", error);
      setCanViewAdmin(false);
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

  useFocusEffect(
    React.useCallback(() => {
      console.log("📊 Dashboard focused - refreshing data");
      fetchDashboardData();
    }, []),
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let activitiesList = [];
      let todayActivities = [];
      let attendanceRecords = [];
      let pending = 0;
      let approved = 0;

      // Fetch all activities (courses/sessions)
      try {
        const activitiesRes = await api.get("/activities");
        // Handle both array and object response formats
        activitiesList = Array.isArray(activitiesRes.data)
          ? activitiesRes.data
          : activitiesRes.data?.activities || [];

        if (!Array.isArray(activitiesList)) {
          console.warn(
            "⚠️ Activities response format invalid:",
            typeof activitiesList,
          );
          activitiesList = [];
        }

        setCourses(activitiesList);
        console.log("✅ Activities fetched:", activitiesList.length);

        // Filter today's activities
        const today = new Date().toISOString().split("T")[0];
        todayActivities = activitiesList.filter((activity) => {
          const activityDate = activity.start_time?.split("T")[0];
          return activityDate === today;
        });
        setSessions(todayActivities);
        console.log("✅ Today's activities:", todayActivities.length);
      } catch (err) {
        console.warn("⚠️ Could not fetch activities:", err.message);
        setCourses([]);
        setSessions([]);
      }

      // Fetch attendance history (skip for admin users)
      if (user?.user_type !== "admin") {
        try {
          const attendanceRes = await api.get("/attendance/my-attendance");
          attendanceRecords = attendanceRes.data || [];
          const present = attendanceRecords.filter(
            (a) => a.status === "present",
          ).length;
          const absent = attendanceRecords.filter(
            (a) => a.status === "absent",
          ).length;
          console.log(
            "✅ Attendance fetched. Present:",
            present,
            "Absent:",
            absent,
          );

          const total = present + absent || 1;
          const rate = Math.round((present / total) * 100);
          setAttendanceRate(rate);

          setStats((prev) => ({
            ...prev,
            presentDays: present,
            absentDays: absent,
          }));
        } catch (err) {
          console.warn("⚠️ Could not fetch attendance:", err.message);
        }
      } else {
        console.log("ℹ️  Skipping attendance fetch for admin user");
      }

      // Fetch leaves
      try {
        const leavesRes = await api.get("/leaves");
        const leavesList = Array.isArray(leavesRes.data)
          ? leavesRes.data
          : leavesRes.data.leaves || [];
        pending = leavesList.filter((l) => l.status === "pending").length;
        approved = leavesList.filter((l) => l.status === "approved").length;
        console.log(
          "✅ Leaves fetched. Pending:",
          pending,
          "Approved:",
          approved,
        );

        setStats((prev) => ({
          ...prev,
          pendingLeaves: pending,
          approvedLeaves: approved,
        }));
      } catch (err) {
        console.warn("⚠️ Could not fetch leaves:", err.message);
      }

      setStats((prev) => ({
        ...prev,
        totalCourses: activitiesList.length,
        upcomingSessions: todayActivities.length,
      }));
    } catch (error) {
      console.error("❌ Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAdminAccess();
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleAdminNavigation = (screen) => {
    if (!canViewAdmin) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to access this admin feature. Only Priority 1 users or delegated admins can access admin panel.",
      );
      return;
    }
    navigation.navigate(screen);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7d53f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back!</Text>
            <Text style={styles.userName}>{user?.name || "Student"}</Text>
          </View>
        </View>

        {/* Attendance Rate Card */}
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceLeft}>
            <View
              style={[
                styles.attendanceCircle,
                {
                  backgroundColor: attendanceRate >= 75 ? "#4CAF50" : "#FF9800",
                },
              ]}
            >
              <Text style={styles.attendancePercent}>{attendanceRate}%</Text>
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.attendanceLabel}>Attendance Rate</Text>
              <Text style={styles.attendanceSubLabel}>
                {stats.presentDays} days present
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.jumpTo("AttendanceTab")}
            style={styles.seeMoreBtn}
          >
            <Ionicons name="chevron-forward" size={20} color="#7d53f6" />
          </TouchableOpacity>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statBox, { borderLeftColor: "#2196F3" }]}
            onPress={() => navigation.navigate("CalendarTab")}
          >
            <View style={styles.statContent}>
              <Ionicons name="book-outline" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{stats.totalCourses}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { borderLeftColor: "#FF9800" }]}
            onPress={() => navigation.jumpTo("CalendarTab")}
          >
            <View style={styles.statContent}>
              <Ionicons name="time-outline" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{stats.upcomingSessions}</Text>
              <Text style={styles.statLabel}>Sessions Today</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { borderLeftColor: "#4CAF50" }]}
            onPress={() => navigation.jumpTo("AttendanceTab")}
          >
            <View style={styles.statContent}>
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="#4CAF50"
              />
              <Text style={styles.statValue}>{stats.presentDays}</Text>
              <Text style={styles.statLabel}>Days Present</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { borderLeftColor: "#F44336" }]}
            onPress={() => navigation.jumpTo("AttendanceTab")}
          >
            <View style={styles.statContent}>
              <Ionicons name="close-circle-outline" size={24} color="#F44336" />
              <Text style={styles.statValue}>{stats.absentDays}</Text>
              <Text style={styles.statLabel}>Days Absent</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Sessions */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Today's Sessions</Text>
            {sessions.slice(0, 3).map((session, index) => (
              <TouchableOpacity
                key={index}
                style={styles.sessionCard}
                onPress={() =>
                  navigation.navigate("ActivityDetail", {
                    sessionId: session.id,
                    courseTitle: session.course_title,
                  })
                }
              >
                <View style={styles.sessionTime}>
                  <Ionicons name="time-outline" size={20} color="#7d53f6" />
                  <Text style={styles.sessionTimeText}>
                    {formatTime(session.start_time)} -{" "}
                    {formatTime(session.end_time)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {session.course_title}
                  </Text>
                  <Text style={styles.sessionFaculty}>
                    {session.faculty_name || "Faculty TBD"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        session.status === "ongoing"
                          ? "#4CAF50"
                          : session.status === "scheduled"
                            ? "#2196F3"
                            : "#999",
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {session.status?.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Leave Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Leave Status</Text>
          <View style={styles.leaveGrid}>
            <TouchableOpacity
              style={styles.leaveCard}
              onPress={() => navigation.jumpTo("LeavesTab")}
            >
              <Ionicons name="checkmark" size={24} color="#4CAF50" />
              <Text style={styles.leaveValue}>{stats.approvedLeaves}</Text>
              <Text style={styles.leaveLabel}>Approved</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leaveCard}
              onPress={() => navigation.jumpTo("LeavesTab")}
            >
              <Ionicons name="time" size={24} color="#FF9800" />
              <Text style={styles.leaveValue}>{stats.pendingLeaves}</Text>
              <Text style={styles.leaveLabel}>Pending</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.jumpTo("CalendarTab")}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="calendar-outline" size={28} color="#7d53f6" />
              </View>
              <Text style={styles.actionLabel}>View Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.jumpTo("LeavesTab")}
            >
              <View style={styles.actionIconBox}>
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color="#9C27B0"
                />
              </View>
              <Text style={styles.actionLabel}>Request Leave</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.jumpTo("AttendanceTab")}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="bar-chart-outline" size={28} color="#2196F3" />
              </View>
              <Text style={styles.actionLabel}>Statistics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.jumpTo("ProfileTab")}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="person-outline" size={28} color="#FF9800" />
              </View>
              <Text style={styles.actionLabel}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Courses List */}
        {courses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📚 My Courses</Text>
              <TouchableOpacity onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {courses.slice(0, 3).map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() =>
                  navigation.navigate("ActivityDetail", {
                    courseId: course.id,
                    courseTitle: course.title,
                  })
                }
              >
                <View style={styles.courseHeader}>
                  <View style={{ flex: 1 }}>
                    {course.course_code && (
                      <Text style={styles.courseCode}>
                        {course.course_code}
                      </Text>
                    )}
                    <Text style={styles.courseTitle} numberOfLines={1}>
                      {course.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.enrollBadge,
                      {
                        backgroundColor:
                          course.enrolled_count >= course.max_students
                            ? "#F44336"
                            : "#4CAF50",
                      },
                    ]}
                  >
                    <Text style={styles.enrollText}>
                      {course.enrolled_count}/{course.max_students}
                    </Text>
                  </View>
                </View>

                <View style={styles.courseFooter}>
                  <View style={styles.facultyInfo}>
                    <Ionicons
                      name="person-circle-outline"
                      size={16}
                      color="#666"
                    />
                    <Text style={styles.facultyName}>
                      {course.faculty_name || "Unassigned"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Admin Panel - Only visible to admins */}
        {canViewAdmin && (
          <View style={styles.section}>
            <View style={styles.adminHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#FF5722" />
              <Text style={styles.adminTitle}>Admin Panel</Text>
            </View>

            <View style={styles.adminGrid}>
              <TouchableOpacity
                style={styles.adminCard}
                onPress={() =>
                  handleAdminNavigation("InfrastructureManagementScreen")
                }
              >
                <View
                  style={[styles.adminIcon, { backgroundColor: "#E0F2F1" }]}
                >
                  <Ionicons
                    name="hardware-chip-outline"
                    size={24}
                    color="#009688"
                  />
                </View>
                <Text style={styles.adminLabel}>Infrastructure</Text>
                <Text style={styles.adminDesc}>Manage facilities</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => handleAdminNavigation("SettingsScreen")}
              >
                <View
                  style={[styles.adminIcon, { backgroundColor: "#F5F5F5" }]}
                >
                  <Ionicons name="settings-outline" size={24} color="#666" />
                </View>
                <Text style={styles.adminLabel}>Settings</Text>
                <Text style={styles.adminDesc}>System config</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => handleAdminNavigation("AuditLogsScreen")}
              >
                <View
                  style={[styles.adminIcon, { backgroundColor: "#FFF3E0" }]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color="#E65100"
                  />
                </View>
                <Text style={styles.adminLabel}>Audit Logs</Text>
                <Text style={styles.adminDesc}>View activity</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => setShowAdminUsersModal(true)}
              >
                <View
                  style={[styles.adminIcon, { backgroundColor: "#FBE9E7" }]}
                >
                  <Ionicons name="people-outline" size={24} color="#FF5722" />
                </View>
                <Text style={styles.adminLabel}>Users</Text>
                <Text style={styles.adminDesc}>Manage users</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => navigation.navigate("AdminCourses")}
              >
                <View
                  style={[styles.adminIcon, { backgroundColor: "#E3F2FD" }]}
                >
                  <Ionicons name="book-outline" size={24} color="#1976D2" />
                </View>
                <Text style={styles.adminLabel}>Manage Courses</Text>
                <Text style={styles.adminDesc}>View & approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminCard}
                onPress={() => handleAdminNavigation("CourseAssignment")}
              >
                <View
                  style={[styles.adminIcon, { backgroundColor: "#F3E5F5" }]}
                >
                  <Ionicons name="link-outline" size={24} color="#7d53f6" />
                </View>
                <Text style={styles.adminLabel}>Assign Course</Text>
                <Text style={styles.adminDesc}>To faculty</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Admin Users Management Modal */}
      <Modal
        visible={showAdminUsersModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAdminUsersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdminUsersModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>User Management</Text>
            <View style={{ width: 24 }} />
          </View>
          <AdminUsersPanel />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  greeting: {
    marginTop: 10,
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 4,
  },
  attendanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  attendanceLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attendanceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  attendancePercent: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  attendanceLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  attendanceSubLabel: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  seeMoreBtn: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: (width - 48) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statContent: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
    fontWeight: "500",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sessionTime: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  sessionTimeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginLeft: 6,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  sessionFaculty: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  leaveGrid: {
    flexDirection: "row",
    gap: 12,
  },
  leaveCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  leaveValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 8,
  },
  leaveLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  courseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  courseCode: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginTop: 2,
  },
  enrollBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  enrollText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  courseFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  facultyInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  facultyName: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0B2",
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF5722",
    marginLeft: 8,
  },
  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  adminCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE0B2",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  adminLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  adminDesc: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
});
export default DashboardScreen;
