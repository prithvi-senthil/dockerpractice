import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";

const PendingCourseCard = ({ course, onActionComplete, refresh }) => {
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleAccept = async () => {
    Alert.alert(
      "Accept Course Assignment",
      `You are about to accept the course assignment for "${course.title}".\n\nSessions will be automatically generated once you accept.\n\nThis action cannot be undone.`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setLoading(true);
              await API.post(`/activities/courses/${course.id}/accept`);
              Alert.alert(
                "✅ Success",
                "Course accepted! Sessions will be created and will appear in your calendar.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      setShowDetailModal(false);
                      onActionComplete?.();
                      refresh?.();
                    },
                  },
                ],
              );
            } catch (error) {
              console.error("Accept course error:", error);
              Alert.alert(
                "❌ Error",
                error.response?.data?.error ||
                  "Failed to accept course. Please try again.",
              );
            } finally {
              setLoading(false);
            }
          },
          style: "default",
        },
      ],
    );
  };

  const handleReject = async () => {
    Alert.alert(
      "Reject Course Assignment",
      `Are you sure you want to reject the assignment for "${course.title}"?\n\nThe admin will be notified of your rejection and can reassign this course to another faculty member.`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Reject",
          onPress: async () => {
            try {
              setLoading(true);
              await API.post(`/activities/courses/${course.id}/reject`);
              Alert.alert(
                "✅ Course Rejected",
                "The admin has been notified of your rejection.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      setShowDetailModal(false);
                      onActionComplete?.();
                      refresh?.();
                    },
                  },
                ],
              );
            } catch (error) {
              console.error("Reject course error:", error);
              Alert.alert(
                "❌ Error",
                error.response?.data?.error ||
                  "Failed to reject course. Please try again.",
              );
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ],
    );
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

  return (
    <>
      {/* Card Preview */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => setShowDetailModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Course Title and Badge */}
          <View style={styles.titleRow}>
            <View style={styles.titleSide}>
              <Ionicons name="book-outline" size={20} color="#7d53f6" />
              <Text style={styles.title} numberOfLines={2}>
                {course.title}
              </Text>
            </View>
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.badgeText}>Pending</Text>
            </View>
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
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
            <Text style={styles.tapHintText}>
              Tap to view details & respond
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <ScrollView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Ionicons name="chevron-back" size={28} color="#7d53f6" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Course Assignment</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Course Card */}
            <View style={styles.courseDetailCard}>
              <View style={styles.courseHeader}>
                <Ionicons name="book-outline" size={32} color="#7d53f6" />
                <View style={styles.courseTitle}>
                  <Text style={styles.mainTitle}>{course.title}</Text>
                  <Text style={styles.courseCode}>{course.course_code}</Text>
                </View>
              </View>

              {/* Status Badge */}
              <View style={styles.statusSection}>
                <View style={styles.statusBadge}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color="#F59E0B"
                  />
                  <Text style={styles.statusText}>Awaiting Your Response</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Course Details Section */}
              <View style={styles.detailsContainer}>
                <Text style={styles.sectionTitle}>📋 Course Details</Text>

                {course.description && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.blockLabel}>Description</Text>
                    <Text style={styles.blockValue}>{course.description}</Text>
                  </View>
                )}

                <View style={styles.detailBlock}>
                  <Text style={styles.blockLabel}>📅 Duration</Text>
                  <Text style={styles.blockValue}>
                    {formatDate(course.start_date)} to{" "}
                    {formatDate(course.end_date)}
                  </Text>
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.blockLabel}>⏰ Time Window</Text>
                  <Text style={styles.blockValue}>
                    {formatTime(course.time_slot_start)} -{" "}
                    {formatTime(course.time_slot_end)}
                  </Text>
                </View>

                {course.schedule_days && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.blockLabel}>📆 Schedule Days</Text>
                    <Text style={styles.blockValue}>
                      {course.schedule_days}
                    </Text>
                  </View>
                )}

                {course.max_students && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.blockLabel}>👥 Max Students</Text>
                    <Text style={styles.blockValue}>
                      {course.max_students} students
                    </Text>
                  </View>
                )}
              </View>

              {/* Important Notes */}
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>ℹ️ Important</Text>
                <View style={styles.noteItem}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#10B981"
                  />
                  <Text style={styles.noteText}>
                    Accepting will auto-generate session records
                  </Text>
                </View>
                <View style={styles.noteItem}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#10B981"
                  />
                  <Text style={styles.noteText}>
                    Course will appear in your calendar
                  </Text>
                </View>
                <View style={styles.noteItem}>
                  <Ionicons
                    name="close-circle-outline"
                    size={16}
                    color="#EF4444"
                  />
                  <Text style={styles.noteText}>
                    Rejection notifies the admin
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#EF4444" size={20} />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                    <Text style={styles.rejectButtonText}>
                      Reject Assignment
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size={20} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.acceptButtonText}>
                      Accept Assignment
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Card Preview
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
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
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

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  headerSpacer: {
    width: 28,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 30,
  },
  courseDetailCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  courseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  courseTitle: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 13,
    color: "#7d53f6",
    fontWeight: "600",
  },
  statusSection: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  detailBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  blockValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    lineHeight: 20,
  },
  notesSection: {
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#7d53f6",
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
    fontWeight: "500",
  },

  // Action Buttons
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectButton: {
    backgroundColor: "#FFF5F5",
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  acceptButton: {
    backgroundColor: "#7d53f6",
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

export default PendingCourseCard;
