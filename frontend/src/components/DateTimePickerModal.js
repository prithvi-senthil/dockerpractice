import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DateTimePickerModal = ({
  visible,
  onClose,
  onConfirm,
  initialDate,
  mode = "datetime", // "datetime", "date", or "time"
  title = "Select Date & Time",
}) => {
  const [selectedDate, setSelectedDate] = useState(
    initialDate ? new Date(initialDate) : new Date(),
  );
  const [selectedTime, setSelectedTime] = useState({
    hours: String(
      initialDate ? new Date(initialDate).getHours() : new Date().getHours(),
    ).padStart(2, "0"),
    minutes: String(
      initialDate
        ? new Date(initialDate).getMinutes()
        : new Date().getMinutes(),
    ).padStart(2, "0"),
  });

  useEffect(() => {
    if (visible && initialDate) {
      const date = new Date(initialDate);
      setSelectedDate(date);
      setSelectedTime({
        hours: String(date.getHours()).padStart(2, "0"),
        minutes: String(date.getMinutes()).padStart(2, "0"),
      });
    }
  }, [visible, initialDate]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === selectedDate.getDate() &&
        selectedDate.getMonth() === new Date().getMonth() &&
        selectedDate.getFullYear() === new Date().getFullYear();

      const isCurrentDay =
        day === selectedDate.getDate() &&
        selectedDate.getMonth() ===
          new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            day,
          ).getMonth();

      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.dayCell, isSelected && styles.dayCellSelected]}
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(day);
            setSelectedDate(newDate);
          }}
        >
          <Text
            style={[
              styles.dayCellText,
              isSelected && styles.dayCellTextSelected,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>,
      );
    }

    // Group days into weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(
        <View key={`week-${i / 7}`} style={styles.weekRow}>
          {days.slice(i, i + 7)}
        </View>,
      );
    }

    return weeks;
  };

  const handleConfirm = () => {
    if (mode === "date") {
      const dateString = selectedDate.toISOString().split("T")[0];
      onConfirm(dateString);
    } else if (mode === "time") {
      const timeString = `${selectedTime.hours}:${selectedTime.minutes}:00`;
      onConfirm(timeString);
    } else {
      // datetime mode
      const dateString = selectedDate.toISOString().split("T")[0];
      const timeString = `${selectedTime.hours}:${selectedTime.minutes}:00`;
      onConfirm({
        date: dateString,
        time: timeString,
        combined: `${dateString}T${selectedTime.hours}:${selectedTime.minutes}:00`,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Calendar - Show for date and datetime modes */}
            {(mode === "date" || mode === "datetime") && (
              <>
                {/* Month/Year Selector */}
                <View style={styles.monthSelector}>
                  <TouchableOpacity
                    onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#7d53f6" />
                  </TouchableOpacity>
                  <Text style={styles.monthText}>
                    {selectedDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color="#7d53f6"
                    />
                  </TouchableOpacity>
                </View>

                {/* Calendar */}
                <View style={styles.calendar}>
                  <View style={styles.weekdaysHeader}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <Text key={day} style={styles.weekdayText}>
                          {day}
                        </Text>
                      ),
                    )}
                  </View>
                  {renderCalendar()}
                </View>
              </>
            )}

            {/* Time Selector - Show for time and datetime modes */}
            {(mode === "time" || mode === "datetime") && (
              <View style={styles.timeSelector}>
                <Text style={styles.timeLabel}>Set Time:</Text>
                <View style={styles.timeInputs}>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeUnitLabel}>Hours</Text>
                    <TextInput
                      style={styles.timeField}
                      placeholder="09"
                      value={selectedTime.hours}
                      onChangeText={(val) => {
                        const num = parseInt(val) || 0;
                        if (num >= 0 && num <= 23) {
                          setSelectedTime({
                            ...selectedTime,
                            hours: String(num).padStart(2, "0"),
                          });
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>

                  <Text style={styles.timeSeparator}>:</Text>

                  <View style={styles.timeInput}>
                    <Text style={styles.timeUnitLabel}>Minutes</Text>
                    <TextInput
                      style={styles.timeField}
                      placeholder="00"
                      value={selectedTime.minutes}
                      onChangeText={(val) => {
                        const num = parseInt(val) || 0;
                        if (num >= 0 && num <= 59) {
                          setSelectedTime({
                            ...selectedTime,
                            minutes: String(num).padStart(2, "0"),
                          });
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: "#fff" }]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    maxHeight: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalBody: {
    padding: 16,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  calendar: {
    marginBottom: 20,
  },
  weekdaysHeader: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  dayCellSelected: {
    backgroundColor: "#7d53f6",
  },
  dayCellText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dayCellTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  timeSelector: {
    paddingVertical: 20,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  timeInputs: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  timeInput: {
    alignItems: "center",
  },
  timeUnitLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  timeField: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 8,
    color: "#333",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  confirmButton: {
    backgroundColor: "#7d53f6",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
});

export default DateTimePickerModal;
