import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const ConflictAlertModal = ({
  visible,
  conflicts,
  onDismiss,
  onReassign,
  loading,
}) => {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.headerTitle}>Schedule Conflict Detected</Text>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              This faculty member already has existing courses that conflict
              with the proposed schedule.
            </Text>
          </View>

          {/* Conflicts List */}
          <ScrollView
            style={styles.conflictsList}
            showsVerticalScrollIndicator={true}
          >
            {conflicts.map((conflict, index) => (
              <View key={index} style={styles.conflictItem}>
                <View style={styles.conflictHeader}>
                  <Text style={styles.conflictTitle}>{conflict.title}</Text>
                  <View style={styles.conflictBadge}>
                    <Text style={styles.badgeText}>Existing</Text>
                  </View>
                </View>

                <View style={styles.conflictDetail}>
                  <Text style={styles.conflictLabel}>📅 Days:</Text>
                  <Text style={styles.conflictValue}>
                    {conflict.schedule_days
                      .split(",")
                      .map((d) => d.trim())
                      .join(", ")}
                  </Text>
                </View>

                <View style={styles.conflictDetail}>
                  <Text style={styles.conflictLabel}>🕐 Time:</Text>
                  <Text style={styles.conflictValue}>
                    {conflict.time_slot_start} - {conflict.time_slot_end}
                  </Text>
                </View>

                {/* Overlap indicator */}
                <View style={styles.overlapIndicator}>
                  <View style={styles.overlapDot} />
                  <Text style={styles.overlapText}>
                    Same day & overlapping time slot
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Recommendation */}
          <View style={styles.recommendation}>
            <Text style={styles.recommendationTitle}>💡 Recommendations:</Text>
            <Text style={styles.recommendationText}>
              • Choose different schedule days{"\n"}• Change the time slot{"\n"}
              • Assign to a different faculty member
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onDismiss}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.reassignButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={onReassign}
              disabled={loading}
            >
              <Text style={styles.reassignButtonText}>
                Reassign Different Faculty
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Footer */}
          <Text style={styles.footer}>
            ℹ️ Select a different faculty member to resolve conflicts
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 5,
    borderLeftColor: "#F59E0B",
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  alertIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#92400E",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  messageContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
  },
  message: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 21,
    textAlign: "center",
    fontWeight: "500",
  },
  conflictsList: {
    maxHeight: 220,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  conflictItem: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  conflictHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  conflictTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  conflictBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  conflictDetail: {
    marginBottom: 10,
  },
  conflictLabel: {
    fontSize: 12,
    color: "#7F1D1D",
    marginBottom: 4,
    fontWeight: "700",
  },
  conflictValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  overlapIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#FCA5A5",
  },
  overlapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
    marginRight: 8,
  },
  overlapText: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "700",
  },
  recommendation: {
    backgroundColor: "#DBEAFE",
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 14,
    borderRadius: 10,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E40AF",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  recommendationText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#DC2626",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  reassignButton: {
    backgroundColor: "#3B82F6",
  },
  reassignButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    paddingBottom: 14,
    paddingHorizontal: 16,
    fontWeight: "600",
  },
});

export default ConflictAlertModal;
