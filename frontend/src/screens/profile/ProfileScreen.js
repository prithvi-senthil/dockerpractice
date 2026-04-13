import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import PendingCourseCard from "../../components/PendingCourseCard";

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.user_type === "faculty") {
      fetchPendingCourses();
    }
  }, [user?.user_type]);

  const fetchPendingCourses = async () => {
    try {
      setLoading(true);
      const response = await API.get("/activities/courses/pending");
      setPendingCourses(response.data.courses || []);
    } catch (error) {
      console.error("Fetch pending courses error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingCourses();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#7d53f6"
        />
      }
    >
      {/* Profile Header Card */}
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: "#7d53f6" }]}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: "#7d53f6" }]}>
            <Text style={styles.roleText}>
              {user?.user_type?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Account Information Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User ID:</Text>
          <Text style={styles.infoValue}>{user?.id}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Type:</Text>
          <Text style={styles.infoValue}>
            {user?.user_type === "faculty"
              ? "Faculty"
              : user?.user_type === "admin"
                ? "Admin"
                : "Student"}
          </Text>
        </View>
      </View>

      {/* Pending Courses Section (Faculty Only) */}
      {user?.user_type === "faculty" && (
        <View>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#7d53f6" />
            <Text style={styles.sectionHeaderTitle}>
              Pending Course Assignments
            </Text>
            {pendingCourses.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCourses.length}</Text>
              </View>
            )}
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7d53f6" />
            </View>
          ) : pendingCourses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color="#10B981"
              />
              <Text style={styles.emptyText}>No pending courses</Text>
              <Text style={styles.emptySubText}>
                You're all set! Check back for new course assignments.
              </Text>
            </View>
          ) : (
            <View>
              {pendingCourses.map((course) => (
                <PendingCourseCard
                  key={course.id}
                  course={course}
                  onActionComplete={() => fetchPendingCourses()}
                  refresh={fetchPendingCourses}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#fff",
    margin: 15,
    marginBottom: 8,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginTop: 15,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  roleBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginLeft: 10,
    flex: 1,
  },
  badge: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 8,
    marginBottom: 15,
    paddingVertical: 40,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    marginHorizontal: 15,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ProfileScreen;
