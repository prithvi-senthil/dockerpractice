import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const CalendarScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("sessions");

  // ✅ Get initial date from route params if coming from CreateActivityScreen
  const getInitialDate = () => {
    if (route?.params?.selectedDate) {
      return new Date(route.params.selectedDate);
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ Handle route params when coming from CreateActivityScreen
  useEffect(() => {
    if (route?.params?.selectedDate) {
      setSelectedDate(new Date(route.params.selectedDate));
      setActiveTab("sessions");
    }
    // Clear params after handling
    if (route?.params?.refreshTrigger) {
      setTimeout(() => {
        route.params?.refreshTrigger && fetchData();
      }, 500);
    }
  }, [route?.params?.selectedDate, route?.params?.refreshTrigger]);

  // ✅ Fetch on component mount and when date/tab changes
  useEffect(() => {
    fetchData();
  }, [selectedDate, activeTab]);

  // ✅ Refresh when screen comes into focus (after creating course)
  useFocusEffect(
    React.useCallback(() => {
      console.log("📅 Calendar focused - refreshing data");
      fetchData();
    }, []),
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];

      if (activeTab === "sessions") {
        const response = await api.get("/activities/sessions", {
          params: { date: dateStr },
        });
        // API returns { sessions: [...] }
        setSessions(response.data.sessions || response.data || []);
      } else {
        const response = await api.get("/activities/courses");
        // API returns { courses: [...] }
        let allCourses = response.data.courses || response.data || [];

        // Filter courses based on role
        if (user?.user_type === "faculty") {
          // Faculty sees only their ACCEPTED courses
          allCourses = allCourses.filter(
            (c) => c.assignment_status === "accepted",
          );
        } else if (user?.user_type === "admin") {
          // Admin sees all courses they created (any status)
        }
        // Student shouldn't see this tab but if they do, they see enrolled courses

        console.log("📚 Filtered Courses:", allCourses);
        setCourses(allCourses);
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A";
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "#FF9800",
      ongoing: "#4CAF50",
      completed: "#2196F3",
    };
    return colors[status] || "#9E9E9E";
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDateChange = (event, selected) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selected) {
      setSelectedDate(selected);
    }
  };

  const handleDateNavigation = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const renderSessionCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.sessionCard}
      onPress={() =>
        navigation.navigate("ActivityDetail", {
          sessionId: item.id,
          courseTitle: item.course_title,
          facultyName: item.faculty_name,
        })
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseTitle} numberOfLines={1}>
            {item.course_title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.faculty_name || "Unassigned"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.enrolled_count}/{item.max_students} enrolled
          </Text>
        </View>

        {user?.user_type === "student" && item.status === "ongoing" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#5B6CF6" }]}
            onPress={() =>
              navigation.navigate("ActivityDetail", {
                sessionId: item.id,
                courseTitle: item.course_title,
              })
            }
          >
            <Ionicons name="pencil" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Mark Attendance</Text>
          </TouchableOpacity>
        )}

        {user?.user_type === "faculty" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#4CAF50" }]}
            onPress={() =>
              navigation.navigate("ActivityDetail", {
                sessionId: item.id,
                courseTitle: item.course_title,
              })
            }
          >
            <Ionicons name="lock-closed" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Manage OTP</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCourseCard = (item) => {
    // Determine assignment status badge color and label
    const getAssignmentStatusColor = (status) => {
      const colors = {
        pending: "#FF9800",
        accepted: "#4CAF50",
        rejected: "#F44336",
      };
      return colors[status] || "#9E9E9E";
    };

    const isAccepted = item.assignment_status === "accepted";

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.courseCard}
        onPress={() =>
          navigation.navigate("ActivityDetail", {
            courseId: item.id,
            courseTitle: item.title,
          })
        }
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              {item.course_code && (
                <Text style={styles.courseCode}>{item.course_code}</Text>
              )}
              <Text style={styles.courseTitle}>{item.title}</Text>
            </View>
            {user?.user_type === "admin" && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getAssignmentStatusColor(
                      item.assignment_status,
                    ),
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {item.assignment_status?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-circle-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.faculty_name || "Unassigned"}
            </Text>
          </View>

          {item.description && (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.enrolled_count}/{item.max_students} enrolled
            </Text>
          </View>

          {user?.user_type === "admin" && (
            <>
              {isAccepted ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#7d53f6" }]}
                  onPress={() =>
                    navigation.navigate("StudentEnrollment", {
                      courseId: item.id,
                    })
                  }
                >
                  <Ionicons name="people-sharp" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Add Students</Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={[styles.actionBtn, { backgroundColor: "#CCCCCC" }]}
                >
                  <Ionicons name="hourglass-outline" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    ⏳ Waiting for approval
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B6CF6" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "sessions" && styles.tabActive]}
          onPress={() => setActiveTab("sessions")}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === "sessions" ? "#5B6CF6" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "sessions" && styles.tabTextActive,
            ]}
          >
            Today's Sessions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "courses" && styles.tabActive]}
          onPress={() => setActiveTab("courses")}
        >
          <Ionicons
            name="book-outline"
            size={18}
            color={activeTab === "courses" ? "#5B6CF6" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "courses" && styles.tabTextActive,
            ]}
          >
            All Courses
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "sessions" && (
        <View style={styles.dateSelector}>
          <TouchableOpacity
            onPress={() => handleDateNavigation(-1)}
            style={styles.navArrow}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#5B6CF6" />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            {isToday(selectedDate) && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Today</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDateNavigation(1)}
            style={styles.navArrow}
          >
            <Ionicons name="chevron-forward" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#5B6CF6"]}
          />
        }
      >
        {activeTab === "sessions" ? (
          sessions.length > 0 ? (
            sessions.map(renderSessionCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                No sessions scheduled for today
              </Text>
            </View>
          )
        ) : courses.length > 0 ? (
          courses.map(renderCourseCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No courses available</Text>
          </View>
        )}
      </ScrollView>
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
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#5B6CF6",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#999",
  },
  tabTextActive: {
    color: "#5B6CF6",
    fontWeight: "600",
  },
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  navArrow: {
    padding: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  todayBadge: {
    backgroundColor: "#5B6CF6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  todayBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 12,
  },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  courseCode: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5B6CF6",
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
  },
  descriptionText: {
    fontSize: 12,
    color: "#999",
    marginVertical: 8,
    fontStyle: "italic",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
});

export default CalendarScreen;
