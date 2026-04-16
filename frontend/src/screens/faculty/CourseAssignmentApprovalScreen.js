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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { Ionicons } from "@expo/vector-icons";

const CourseAssignmentApprovalScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchPendingCourses();
    }, []),
  );

  const fetchPendingCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get("/activities/courses/pending");
      setPendingCourses(response.data.courses || []);
    } catch (error) {
      console.error("Fetch pending courses error:", error);
      Alert.alert("Error", "Failed to load pending course assignments");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingCourses();
    setRefreshing(false);
  };

  const handleAccept = async (courseId) => {
    Alert.alert("Confirm", "Do you want to accept this course assignment?", [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          try {
            setLoading(true);
            await api.post(`/activities/courses/${courseId}/accept`);
            Alert.alert("Success", "Course assignment accepted");
            fetchPendingCourses();
          } catch (error) {
            console.error("Accept course error:", error);
            Alert.alert(
              "Error",
              error.response?.data?.error || "Failed to accept course",
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleReject = async (courseId) => {
    Alert.alert("Confirm", "Do you want to reject this course assignment?", [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Reject",
        onPress: async () => {
          try {
            setLoading(true);
            await api.post(`/activities/courses/${courseId}/reject`);
            Alert.alert("Success", "Course assignment rejected");
            fetchPendingCourses();
          } catch (error) {
            console.error("Reject course error:", error);
            Alert.alert(
              "Error",
              error.response?.data?.error || "Failed to reject course",
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderCourseCard = ({ item }) => {
    const startDate = new Date(item.start_date).toLocaleDateString();
    const endDate = new Date(item.end_date).toLocaleDateString();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courseTitle}>{item.title}</Text>
            <Text style={styles.createdBy}>By: {item.created_by_name}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>PENDING</Text>
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
              {item.time_slot_start} - {item.time_slot_end}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="repeat" size={16} color="#7d53f6" />
            <Text style={styles.detailText}>Days: {item.schedule_days}</Text>
          </View>
          {item.description && (
            <View style={styles.detailRow}>
              <Ionicons name="document" size={16} color="#7d53f6" />
              <Text style={styles.detailText}>{item.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-done-circle" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Pending Assignments</Text>
      <Text style={styles.emptySubtitle}>
        All course assignments have been reviewed
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
          data={pendingCourses}
          renderItem={renderCourseCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          scrollEnabled={true}
        />
      )}
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
  createdBy: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ff9800",
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
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#4caf50",
  },
  rejectButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
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
});

export default CourseAssignmentApprovalScreen;
