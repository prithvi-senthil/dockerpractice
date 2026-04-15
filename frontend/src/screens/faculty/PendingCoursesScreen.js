import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import API from "../../services/api";
import PendingCourseCard from "../../components/PendingCourseCard";

const PendingCoursesScreen = ({ navigation }) => {
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useFocusEffect(
    React.useCallback(() => {
      fetchAssignedCourses();
    }, []),
  );

  const fetchAssignedCourses = async () => {
    try {
      setLoading(true);
      // Fetch all assigned courses (pending, accepted, rejected, cancelled, etc.)
      const response = await API.get("/activities/courses");
      setAllCourses(response.data.courses || response.data || []);
    } catch (error) {
      console.error("Fetch assigned courses error:", error);
      Alert.alert("Error", "Failed to fetch your courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignedCourses();
    setRefreshing(false);
  };

  const getPendingCourses = () => {
    return allCourses.filter(
      (c) => c.assignment_status?.toUpperCase() === "PENDING",
    );
  };

  const getDisplayCourses = () => {
    return activeTab === "all" ? allCourses : getPendingCourses();
  };

  const displayCourses = getDisplayCourses();
  const pendingCount = getPendingCourses().length;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7d53f6" />
      </View>
    );
  }

  if (allCourses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="book-outline"
          size={64}
          color="#999"
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>No Courses Assigned</Text>
        <Text style={styles.emptyText}>
          You don't have any courses assigned yet. Contact your administrator to
          assign courses.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.tabActive]}
          onPress={() => setActiveTab("all")}
        >
          <Ionicons
            name="book"
            size={16}
            color={activeTab === "all" ? "#7d53f6" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "all" && styles.tabTextActive,
            ]}
          >
            All Courses ({allCourses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.tabActive]}
          onPress={() => setActiveTab("pending")}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color={activeTab === "pending" ? "#7d53f6" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.tabTextActive,
            ]}
          >
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {displayCourses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={activeTab === "pending" ? "checkmark-circle" : "book-outline"}
            size={48}
            color="#ccc"
          />
          <Text style={styles.emptyMessage}>
            {activeTab === "pending"
              ? "No pending courses"
              : "No courses available"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayCourses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PendingCourseCard course={item} navigation={navigation} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7d53f6"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#7d53f6",
  },
  tabText: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#7d53f6",
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 12,
  },
});

export default PendingCoursesScreen;
