import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../../services/api";

const CalendarScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsAcknowledgement, setNeedsAcknowledgement] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Working hours from settings
  const [startHour, setStartHour] = useState(7); // Default 7 AM
  const [endHour, setEndHour] = useState(19); // Default 7 PM

  // Subscription slot booking from calendar
  const [subTasks, setSubTasks] = useState([]);
  const [subBookModal, setSubBookModal] = useState(false);
  const [subBookStep, setSubBookStep] = useState("task"); // 'task' | 'range' | 'duration'
  const [subClickedHour, setSubClickedHour] = useState(null);
  const [subTask, setSubTask] = useState(null);
  const [subRanges, setSubRanges] = useState([]);
  const [subMeta, setSubMeta] = useState(null);
  const [subDuration, setSubDuration] = useState(30);
  const [subRangeInfo, setSubRangeInfo] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  // Fetch working hours from settings
  const fetchWorkingHours = async () => {
    try {
      const response = await api.get("/settings/working-hours");
      const { working_hours_start, working_hours_end } = response.data || {};

      if (working_hours_start) {
        const startMatch = String(working_hours_start).match(/(\d{1,2}):/);
        const startHourNum = startMatch ? parseInt(startMatch[1], 10) : 7;
        setStartHour(startHourNum);
        console.log("⏰ Calendar start hour updated to:", startHourNum);
      }

      if (working_hours_end) {
        const endMatch = String(working_hours_end).match(/(\d{1,2}):/);
        const endHourNum = endMatch ? parseInt(endMatch[1], 10) : 19;
        setEndHour(endHourNum);
        console.log("⏰ Calendar end hour updated to:", endHourNum);
      }
    } catch (error) {
      console.warn("Could not fetch working hours, using defaults:", error);
      // Use default values (already set in state initialization)
    }
  };

  useEffect(() => {
    fetchWorkingHours();
    fetchSlots(selectedDate);
    checkAcknowledgement();
  }, [selectedDate]);

  useEffect(() => {
    fetchSubTasks();
  }, []);

  // Refetch working hours whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("📅 Calendar screen focused - refetching working hours");
      fetchWorkingHours();
    }, []),
  );

  const fetchSubTasks = async () => {
    try {
      const res = await api.get("/activities/sessions", {
        params: { task_type: "DURATION_SUBSCRIPTION" },
      });
      setSubTasks(res.data?.sessions || []);
    } catch (e) {
      console.error("Error fetching subscription tasks:", e);
    }
  };

  const subTimeToMins = (t) => {
    if (!t) return 0;
    const parts = String(t).split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const subMinsToStr = (m) => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };

  const handleEmptyHourPress = (hour) => {
    if (subTasks.length === 0) return;
    setSubClickedHour(hour);
    setSubTask(subTasks.length === 1 ? subTasks[0] : null);
    setSubBookStep(subTasks.length === 1 ? "range" : "task");
    setSubRanges([]);
    setSubMeta(null);
    setSubRangeInfo(null);
    setSubBookModal(true);
    if (subTasks.length === 1) loadSubRangesForTask(subTasks[0], hour);
  };

  const loadSubRangesForTask = async (task, hour) => {
    setSubLoading(true);
    try {
      const res = await api.get(`/activities/sessions/${task.id}`, {
        params: { date: selectedDate.toISOString().split("T")[0] },
      });
      const {
        available_ranges = [],
        min_session_minutes,
        max_session_minutes,
        remaining_balance,
      } = res.data || {};
      const dateStr = selectedDate.toISOString().split("T")[0];
      const dayRanges = available_ranges.filter((r) => r.date === dateStr);
      setSubRanges(dayRanges);
      setSubMeta({
        min_session_minutes: min_session_minutes || 30,
        max_session_minutes: max_session_minutes || 120,
        remaining_balance: remaining_balance || 0,
      });
      setSubDuration(min_session_minutes || 30);

      const hourStartMins = hour * 60;
      const hourEndMins = (hour + 1) * 60;
      let found = null;
      for (const r of dayRanges) {
        const rStart = subTimeToMins(r.free_from);
        const rEnd = subTimeToMins(r.free_until);
        if (rEnd <= hourStartMins || rStart >= hourEndMins) continue;
        const effectiveStart = Math.max(rStart, hourStartMins);
        const maxDuration = Math.min(
          rEnd - effectiveStart,
          max_session_minutes || 120,
          remaining_balance || 0,
        );
        if (maxDuration >= (min_session_minutes || 30)) {
          found = { effectiveStart, maxEnd: effectiveStart + maxDuration };
          break;
        }
      }
      setSubRangeInfo(found);
      setSubBookStep(found ? "duration" : "range");
    } catch (e) {
      Alert.alert("Error", "Could not load available slots.");
      setSubBookModal(false);
    } finally {
      setSubLoading(false);
    }
  };

  const handleSubBookConfirm = async () => {
    if (!subTask || !subRangeInfo || !subMeta) return;
    setSubLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const endMin = subRangeInfo.effectiveStart + subDuration;
      await api.post(`/activities/sessions/${subTask.id}/book`, {
        slot_date: dateStr,
        slot_start_time: subMinsToStr(subRangeInfo.effectiveStart) + ":00",
        slot_end_time: subMinsToStr(endMin) + ":00",
      });
      Alert.alert(
        "Slot Reserved!",
        `${dateStr} · ${subMinsToStr(subRangeInfo.effectiveStart)} – ${subMinsToStr(endMin)}\n\nPress "Start Session" at the scheduled time.`,
      );
      setSubBookModal(false);
      fetchSlots(selectedDate);
    } catch (e) {
      Alert.alert(
        "Booking Failed",
        e.response?.data?.error || "Could not reserve slot.",
      );
    } finally {
      setSubLoading(false);
    }
  };

  const fetchSlots = async (date) => {
    try {
      setLoading(true);
      const dateStr = date.toISOString().split("T")[0];

      // Fetch sessions
      const sessionsRes = await api.get("/activities/sessions", {
        params: { date: dateStr },
      });
      const sessions = sessionsRes.data?.sessions || [];

      // Fetch accepted courses
      let courseSlots = [];
      try {
        const coursesRes = await api.get("/activities/courses");
        const courses = coursesRes.data?.courses || [];

        // Filter for accepted courses only
        const acceptedCourses = courses.filter(
          (c) => c.assignment_status === "accepted",
        );

        // Fetch sessions for each accepted course
        for (const course of acceptedCourses) {
          try {
            const courseSessionsRes = await api.get(
              `/activities/courses/${course.id}/sessions`,
            );
            const courseSessions = courseSessionsRes.data?.sessions || [];

            // Filter sessions for the selected date
            const dateSessions = courseSessions.filter((session) => {
              const sessionDate = session.session_date?.split("T")[0] || "";
              return sessionDate === dateStr;
            });

            // Transform course sessions to match slot format
            dateSessions.forEach((session) => {
              courseSlots.push({
                id: `course-${course.id}-${session.id}`,
                task_title: course.title,
                start_time: session.start_time,
                end_time: session.end_time,
                slot_type: "COURSE",
                creator_name: course.faculty_name || "Faculty",
                course_id: course.id,
                session_id: session.id,
                score: 0,
                penalty: 0,
                assignment_status: "COURSE",
              });
            });
          } catch (e) {
            console.warn(`Could not fetch sessions for course ${course.id}`);
          }
        }
      } catch (e) {
        console.warn("Could not fetch accepted courses");
      }

      // Merge sessions and course slots
      const allSlots = [...sessions, ...courseSlots];
      console.log("📅 Calendar slots:", allSlots);
      setSlots(allSlots);
    } catch (error) {
      console.error("Fetch slots error:", error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAcknowledgement = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const selectedStr = selectedDate.toISOString().split("T")[0];

      if (selectedStr === today) {
        // Try to fetch acknowledgement status, but don't fail if endpoint doesn't exist
        try {
          const response = await api.get("/activities/acknowledgement-status", {
            params: { date: today },
          });
          const { acknowledged, has_tasks } = response.data;
          setNeedsAcknowledgement(has_tasks && !acknowledged);
        } catch (apiError) {
          // Endpoint doesn't exist, skip acknowledgement feature
          setNeedsAcknowledgement(false);
        }
      } else {
        setNeedsAcknowledgement(false);
      }
    } catch (error) {
      console.error("Check acknowledgement error:", error);
      setNeedsAcknowledgement(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      const date = selectedDate.toISOString().split("T")[0];
      await api.post("/activities/acknowledge", { date });
      Alert.alert("Success", "Tasks acknowledged!");
      setNeedsAcknowledgement(false);
    } catch (error) {
      // Endpoint doesn't exist, just clear the banner
      setNeedsAcknowledgement(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchSlots(selectedDate), checkAcknowledgement()]);
    } finally {
      setRefreshing(false);
    }
  };

  const generate24Hours = () => {
    const hours = [];
    // Only generate hours within working hours
    for (let i = startHour; i <= endHour; i++) {
      hours.push({
        hour: i,
        label:
          i === 0
            ? "12 AM"
            : i < 12
              ? `${i} AM`
              : i === 12
                ? "12 PM"
                : `${i - 12} PM`,
        time: `${i.toString().padStart(2, "0")}:00`,
      });
    }
    return hours;
  };

  const pad2 = (n) => String(n).padStart(2, "0");

  const selectedYmd = `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth() + 1)}-${pad2(selectedDate.getDate())}`;

  const extractYmd = (value) => {
    if (!value) return null;
    const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  };

  const extractMinuteOfDay = (value) => {
    if (!value) return null;
    const match = String(value).match(/(\d{2}):(\d{2})(?::\d{2})?/);
    if (!match) return null;
    const hh = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };

  const getSlotsForHour = (hour) => {
    const hourStartMin = hour * 60;
    const hourEndMin = (hour + 1) * 60;

    return slots.filter((slot) => {
      const startYmd = extractYmd(slot.start_date || slot.start_time);
      let endYmd = extractYmd(slot.end_date || slot.end_time);
      if (!startYmd || !endYmd) return false;

      if (
        String(slot.assignment_status || "").toUpperCase() === "FLOATING_TODAY"
      ) {
        endYmd = startYmd;
      }

      if (startYmd > selectedYmd || endYmd < selectedYmd) return false;

      const startMinRaw = extractMinuteOfDay(slot.start_time);
      const endMinRaw = extractMinuteOfDay(slot.end_time);
      if (startMinRaw == null || endMinRaw == null) return false;

      const effectiveStartMin = startYmd < selectedYmd ? 0 : startMinRaw;
      const effectiveEndMin = endYmd > selectedYmd ? 24 * 60 : endMinRaw;

      return effectiveStartMin < hourEndMin && effectiveEndMin > hourStartMin;
    });
  };

  const isInDefaultWindow = (hour) => {
    return hour >= startHour && hour <= endHour;
  };

  const getSlotColor = (slotType) => {
    const colors = {
      TASK: "#7d53f6",
      LEAVE: "#9C27B0",
      MEETING: "#FF9800",
      BLOCK: "#F44336",
      ON_DUTY: "#4CAF50",
      COURSE: "#2196F3",
    };
    return colors[slotType] || "#757575";
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const match = timeString.match(/(\d{2}):(\d{2})(?::\d{2})?/);
    if (!match) return "N/A";

    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${ampm}`;
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTaskPress = (slot) => {
    if (!slot) return;

    // Handle course slots
    if (slot.slot_type === "COURSE" && slot.course_id) {
      navigation.navigate("CourseDetails", { courseId: slot.course_id });
      return;
    }

    // Handle task slots
    if (slot.task_id) {
      navigation.navigate("TaskDetail", { taskId: slot.task_id });
    }
  };

  const hours = generate24Hours();

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>

      {/* Morning Awareness Banner */}
      {needsAcknowledgement && (
        <TouchableOpacity
          style={styles.acknowledgeBanner}
          onPress={handleAcknowledge}
        >
          <Ionicons name="warning" size={24} color="#fff" />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Morning Awareness</Text>
            <Text style={styles.bannerSubtitle}>
              Acknowledge today's tasks by 8:30 AM
            </Text>
          </View>
          <View style={styles.acknowledgeBtn}>
            <Text style={styles.acknowledgeBtnText}>Acknowledge</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(selectedDate.getDate() - 1);
            setSelectedDate(newDate);
          }}
          style={styles.navArrow}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color="#5B6CF6"
            style={styles.calendarIcon}
          />
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          {isToday(selectedDate) && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(selectedDate.getDate() + 1);
            setSelectedDate(newDate);
          }}
          style={styles.navArrow}
        >
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Native Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* 24-Hour Timeline */}
      <ScrollView
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#5B6CF6"]}
            tintColor="#5B6CF6"
          />
        }
      >
        {hours.map((hourData) => {
          const hourSlots = getSlotsForHour(hourData.hour);
          const isDefault = isInDefaultWindow(hourData.hour);

          return (
            <View
              key={hourData.hour}
              style={[styles.hourCard, isDefault && styles.hourCardDefault]}
            >
              <View style={styles.hourLabel}>
                <Text
                  style={[styles.hourText, isDefault && styles.hourTextDefault]}
                >
                  {hourData.label}
                </Text>
                {isDefault && (
                  <View style={styles.defaultIndicator}>
                    <Ionicons name="eye" size={12} color="#7d53f6" />
                  </View>
                )}
              </View>

              <View style={styles.hourContent}>
                {hourSlots.length === 0 ? (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={() => handleEmptyHourPress(hourData.hour)}
                    activeOpacity={subTasks.length > 0 ? 0.6 : 1}
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={subTasks.length > 0 ? "#7d53f6" : "#ccc"}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        subTasks.length > 0 && {
                          color: "#7d53f6",
                        },
                      ]}
                    >
                      {subTasks.length > 0
                        ? "Tap to book session"
                        : "Available"}
                    </Text>
                    {subTasks.length > 0 && (
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color="#7d53f6"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                ) : (
                  hourSlots.map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.slotCard,
                        {
                          borderLeftColor: getSlotColor(slot.slot_type),
                        },
                      ]}
                      onPress={() => handleTaskPress(slot)}
                      disabled={!slot.task_id && slot.slot_type !== "COURSE"}
                    >
                      {slot.task_title && (
                        <Text style={styles.taskTitle} numberOfLines={1}>
                          {slot.task_title}
                        </Text>
                      )}

                      <View style={styles.infoRow}>
                        {slot.creator_name && (
                          <View style={styles.creatorRow}>
                            <Ionicons
                              name="person-circle-outline"
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.creatorText}>
                              {slot.creator_name}
                            </Text>
                          </View>
                        )}
                        <View style={styles.timeRow}>
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color="#666"
                          />
                          <Text style={styles.slotTime}>
                            {formatTime(slot.start_time)} -{" "}
                            {formatTime(slot.end_time)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.bottomRow}>
                        <View style={styles.scoreRow}>
                          {slot.score > 0 && (
                            <View style={styles.scoreBadge}>
                              <Ionicons
                                name="trophy-outline"
                                size={10}
                                color="#4CAF50"
                              />
                              <Text style={styles.scoreText}>
                                +{slot.score}
                              </Text>
                            </View>
                          )}
                          {slot.penalty > 0 && (
                            <View style={styles.penaltyBadge}>
                              <Ionicons
                                name="alert-circle-outline"
                                size={10}
                                color="#F44336"
                              />
                              <Text style={styles.penaltyText}>
                                -{slot.penalty}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.statusRow}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: getSlotColor(slot.slot_type),
                              },
                            ]}
                          >
                            <Text style={styles.statusText}>
                              {slot.slot_type}
                            </Text>
                          </View>
                          {slot.assignment_status && (
                            <View style={styles.taskStatusBadge}>
                              <Text style={styles.taskStatusText}>
                                {slot.assignment_status}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {slot.task_id && (
                        <View style={styles.tapIndicator}>
                          <Text style={styles.tapText}>Tap to view</Text>
                          <Ionicons
                            name="chevron-forward"
                            size={12}
                            color="#7d53f6"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Subscription slot booking modal */}
      <Modal visible={subBookModal} animationType="slide" transparent>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalSheet}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>
                {subBookStep === "task"
                  ? "Select Task"
                  : subBookStep === "range"
                    ? "No Free Hours"
                    : "Set Duration"}
              </Text>
              <TouchableOpacity onPress={() => setSubBookModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {subLoading ? (
              <ActivityIndicator
                size="large"
                color="#7d53f6"
                style={{ margin: 24 }}
              />
            ) : subBookStep === "task" ? (
              <ScrollView>
                <Text style={styles.subHint}>
                  Choose the subscription task to book:
                </Text>
                {subTasks.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.subTaskRow}
                    onPress={() => {
                      setSubTask(t);
                      setSubBookStep("range");
                      loadSubRangesForTask(t, subClickedHour);
                    }}
                  >
                    <Ionicons
                      name="clipboard-outline"
                      size={20}
                      color="#7d53f6"
                    />
                    <Text style={styles.subTaskTitle}>{t.title}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : subBookStep === "range" ? (
              <View
                style={{
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={40}
                  color="#F59E0B"
                />
                <Text
                  style={{
                    marginTop: 12,
                    color: "#374151",
                    textAlign: "center",
                  }}
                >
                  No free time in this hour that fits the minimum session
                  duration.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.subConfirmBtn,
                    {
                      marginTop: 16,
                      backgroundColor: "#E5E7EB",
                    },
                  ]}
                  onPress={() => setSubBookModal(false)}
                >
                  <Text
                    style={{
                      color: "#374151",
                      fontWeight: "700",
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.subSummary}>
                  <Ionicons name="calendar-outline" size={20} color="#7d53f6" />
                  <Text style={styles.subSummaryText}>
                    {selectedDate.toISOString().split("T")[0]} · starts{" "}
                    {subRangeInfo && subMinsToStr(subRangeInfo.effectiveStart)}
                  </Text>
                </View>
                {subTask && <Text style={styles.subHint}>{subTask.title}</Text>}
                <Text style={styles.subDurationLabel}>
                  Session Duration (minutes)
                </Text>
                <View style={styles.subDurationRow}>
                  <TouchableOpacity
                    style={styles.subDurationBtn}
                    onPress={() =>
                      setSubDuration((d) =>
                        Math.max(subMeta.min_session_minutes, d - 5),
                      )
                    }
                  >
                    <Ionicons name="remove" size={22} color="#7d53f6" />
                  </TouchableOpacity>
                  <View
                    style={{
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.subDurationValue}>{subDuration}</Text>
                    <Text style={styles.subDurationUnit}>min</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.subDurationBtn}
                    onPress={() => {
                      if (!subRangeInfo || !subMeta) return;
                      const maxD = Math.min(
                        subMeta.max_session_minutes,
                        subMeta.remaining_balance,
                        subRangeInfo.maxEnd - subRangeInfo.effectiveStart,
                      );
                      setSubDuration((d) => Math.min(maxD, d + 5));
                    }}
                  >
                    <Ionicons name="add" size={22} color="#7d53f6" />
                  </TouchableOpacity>
                </View>
                {subRangeInfo && subMeta && (
                  <Text style={styles.subDurationRange}>
                    Min: {subMeta.min_session_minutes}m · Max:{" "}
                    {Math.min(
                      subMeta.max_session_minutes,
                      subMeta.remaining_balance,
                      subRangeInfo.maxEnd - subRangeInfo.effectiveStart,
                    )}
                    m
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.subConfirmBtn}
                  onPress={handleSubBookConfirm}
                  disabled={subLoading}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.subConfirmBtnText}>Book This Slot</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  acknowledgeBanner: {
    flexDirection: "row",
    backgroundColor: "#FF9800",
    padding: 16,
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  acknowledgeBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acknowledgeBtnText: {
    color: "#FF9800",
    fontSize: 12,
    fontWeight: "700",
  },
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  navArrow: {
    padding: 8,
  },
  dateButton: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  calendarIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
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
  timeline: {
    flex: 1,
  },
  hourCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  hourCardDefault: {
    borderColor: "#7d53f6",
    borderWidth: 2,
  },
  hourLabel: {
    width: 80,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  hourText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  hourTextDefault: {
    color: "#7d53f6",
  },
  defaultIndicator: {
    marginTop: 4,
  },
  hourContent: {
    flex: 1,
    padding: 12,
  },
  emptySlot: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  slotCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  creatorText: {
    fontSize: 10,
    color: "#666",
    marginLeft: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  slotTime: {
    fontSize: 10,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 9,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 2,
  },
  penaltyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  penaltyText: {
    fontSize: 9,
    color: "#F44336",
    fontWeight: "600",
    marginLeft: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 8,
    color: "#fff",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  taskStatusBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taskStatusText: {
    fontSize: 8,
    color: "#1976D2",
    fontWeight: "600",
  },
  tapIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  tapText: {
    fontSize: 9,
    color: "#7d53f6",
    fontWeight: "500",
    marginRight: 3,
  },

  subModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  subModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "75%",
  },
  subModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  subModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a2e",
  },
  subHint: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  subTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    gap: 10,
  },
  subTaskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  subSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F0FF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  subSummaryText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    flex: 1,
  },
  subDurationLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  subDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 8,
  },
  subDurationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#7d53f6",
    alignItems: "center",
    justifyContent: "center",
  },
  subDurationValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1a1a2e",
  },
  subDurationUnit: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  subDurationRange: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 16,
  },
  subConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7d53f6",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  subConfirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default CalendarScreen;
