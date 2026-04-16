import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await API.get("/activities/notifications");
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Fetch notifications error:", error);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await API.post(`/activities/notifications/${notificationId}/read`);
      const updated = notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: 1 } : n,
      );
      setNotifications(updated);
    } catch (error) {
      console.error("Mark notification error:", error);
      Alert.alert("Error", "Failed to mark notification");
    }
  };

  const getIconName = (type) => {
    switch (type) {
      case "COURSE_ACCEPTED":
        return "checkmark-circle";
      case "COURSE_REJECTED":
        return "close-circle";
      case "COURSE_ASSIGNED":
        return "list";
      default:
        return "notifications";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "COURSE_ACCEPTED":
        return "#10B981";
      case "COURSE_REJECTED":
        return "#EF4444";
      case "COURSE_ASSIGNED":
        return "#3B82F6";
      default:
        return "#7d53f6";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        item.is_read === 0 && styles.notificationCardUnread,
      ]}
      onPress={() => {
        if (!item.is_read) {
          handleMarkAsRead(item.id);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getIconName(item.type)}
          size={24}
          color={getIconColor(item.type)}
        />
      </View>

      <View style={styles.contentContainer}>
        <Text
          style={[styles.title, item.is_read === 0 && styles.titleUnread]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
      </View>

      {item.is_read === 0 && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7d53f6" />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color="#ddd"
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyText}>No notifications yet</Text>
        <Text style={styles.emptySubText}>
          Notifications about course assignments will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      renderItem={renderNotificationItem}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#7d53f6"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContent: {
    paddingVertical: 8,
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
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderLeftColor: "#e5e7eb",
  },
  notificationCardUnread: {
    backgroundColor: "#F5F3FF",
    borderLeftColor: "#7d53f6",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: "700",
    color: "#7d53f6",
  },
  message: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7d53f6",
    marginLeft: 8,
    alignSelf: "center",
  },
});

export default NotificationScreen;
