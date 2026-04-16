import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PendingCourseCard = ({ course, navigation }) => {
  const handleCardPress = () => {
    // Navigate to CourseDetailsScreen
    navigation.navigate("CourseDetails", { courseId: course.id });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return {
          backgroundColor: "#F59E0B",
          iconName: "time-outline",
          text: "Pending",
          color: "#fff",
        };
      case "ACCEPTED":
        return {
          backgroundColor: "#10B981",
          iconName: "checkmark-circle",
          text: "Accepted",
          color: "#fff",
        };
      case "REJECTED":
        return {
          backgroundColor: "#EF4444",
          iconName: "close-circle",
          text: "Rejected",
          color: "#fff",
        };
      case "CANCELLED":
        return {
          backgroundColor: "#6B7280",
          iconName: "ban",
          text: "Cancelled",
          color: "#fff",
        };
      default:
        return {
          backgroundColor: "#9CA3AF",
          iconName: "help-circle",
          text: status || "Unknown",
          color: "#fff",
        };
    }
  };

  const statusStyle = getStatusBadgeStyle(course?.status);

  const getHintText = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "Tap to view details & respond";
      case "ACCEPTED":
        return "Tap to view course details";
      case "REJECTED":
        return "Tap to view rejection details";
      default:
        return "Tap to view details";
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Course Title and Badge */}
        <View style={styles.titleRow}>
          <View style={styles.titleSide}>
            <Ionicons name="book" size={20} color="#7d53f6" />
            <Text style={styles.title} numberOfLines={2}>
              {course.title}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.backgroundColor },
            ]}
          >
            <Ionicons
              name={statusStyle.iconName}
              size={12}
              color={statusStyle.color}
            />
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>
              {statusStyle.text}
            </Text>
          </View>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={14} color="#666" />
            <Text style={styles.infoText}>
              {formatDate(course.start_date)} to {formatDate(course.end_date)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.infoText}>
              {formatTime(course.time_slot_start)} -{" "}
              {formatTime(course.time_slot_end)}
            </Text>
          </View>
        </View>

        {/* Tap to View Details */}
        <View style={styles.tapHint}>
          <Ionicons name="chevron-forward" size={14} color="#7d53f6" />
          <Text style={styles.tapHintText}>{getHintText(course?.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleSide: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  tapHintText: {
    fontSize: 12,
    color: "#7d53f6",
    fontWeight: "500",
  },
});

export default PendingCourseCard;
