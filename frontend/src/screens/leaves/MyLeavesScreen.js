import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const MyLeavesScreen = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isFaculty = user?.user_type === "faculty";

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await api.get("/leaves");
      setLeaves(response.data);
    } catch (error) {
      console.error("Fetch leaves error:", error);
      Alert.alert("Error", "Failed to fetch leave requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  const handleUpdateStatus = async (leaveId, status) => {
    Alert.prompt(
      `${status === "approved" ? "Approve" : "Reject"} Leave`,
      "Add remarks (optional):",
      async (remarks) => {
        try {
          await api.patch(`/leaves/${leaveId}`, { status, remarks });
          Alert.alert("Success", `Leave request ${status}`);
          fetchLeaves();
        } catch (error) {
          console.error("Update leave error:", error);
          Alert.alert("Error", "Failed to update leave request");
        }
      },
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "#34C759";
      case "rejected":
        return "#FF3B30";
      default:
        return "#FF9500";
    }
  };

  const renderLeaveItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.activityTitle}>{item.activity_title}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {isFaculty && (
        <Text style={styles.studentName}>Student: {item.student_name}</Text>
      )}

      <View style={styles.infoRow}>
        <Text style={styles.label}>Leave Date:</Text>
        <Text style={styles.value}>
          {new Date(item.leave_date).toLocaleDateString("en-IN")}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Reason:</Text>
        <Text style={styles.value}>{item.reason}</Text>
      </View>

      {item.remarks && (
        <View style={styles.remarksBox}>
          <Text style={styles.remarksLabel}>Remarks:</Text>
          <Text style={styles.remarksText}>{item.remarks}</Text>
        </View>
      )}

      <Text style={styles.timestamp}>
        Requested: {new Date(item.created_at).toLocaleString("en-IN")}
      </Text>

      {/* Faculty Actions */}
      {isFaculty && item.status === "pending" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleUpdateStatus(item.id, "approved")}
          >
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleUpdateStatus(item.id, "rejected")}
          >
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isFaculty ? "Leave Requests" : "My Leave Requests"}
        </Text>
      </View>

      <FlatList
        data={leaves}
        renderItem={renderLeaveItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No leave requests</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  listContent: {
    padding: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  studentName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: "#666",
    width: 90,
  },
  value: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  remarksBox: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  remarksLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  remarksText: {
    fontSize: 14,
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 10,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#34C759",
  },
  rejectButton: {
    backgroundColor: "#FF3B30",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});

export default MyLeavesScreen;
