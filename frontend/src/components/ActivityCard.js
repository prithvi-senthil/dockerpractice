import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ActivityCard = ({ activity, onPress }) => {
  const formatTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#FF9500';
      case 'ongoing':
        return '#34C759';
      case 'completed':
        return '#8E8E93';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {activity.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(activity.status) },
          ]}
        >
          <Text style={styles.statusText}>{activity.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.owner}>Faculty: {activity.owner_name}</Text>

      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>⏰</Text>
        <Text style={styles.timeText}>
          {formatTime(activity.start_time)} - {formatTime(activity.end_time)}
        </Text>
      </View>

      {activity.location && (
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>📍</Text>
          <Text style={styles.locationText}>{activity.location}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.enrolledText}>
          👥 {activity.enrolled_count || 0} / {activity.max_students} enrolled
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  owner: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  timeLabel: {
    fontSize: 14,
    marginRight: 5,
  },
  timeText: {
    fontSize: 14,
    color: '#333',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationLabel: {
    fontSize: 14,
    marginRight: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 5,
  },
  enrolledText: {
    fontSize: 12,
    color: '#666',
  },
});

export default ActivityCard;