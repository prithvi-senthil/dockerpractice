import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AttendanceCard = ({ record }) => {
  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-';
    const date = new Date(dateTime);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return '#34C759';
      case 'absent':
        return '#FF3B30';
      case 'on_leave':
        return '#FF9500';
      case 'late':
        return '#FFD60A';
      case 'left_early':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'on_leave':
        return 'On Leave';
      case 'late':
        return 'Late';
      case 'left_early':
        return 'Left Early';
      default:
        return status;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {record.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(record.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {getStatusText(record.status).toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.owner}>Faculty: {record.activity_owner}</Text>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Activity Date:</Text>
        <Text style={styles.value}>
          {new Date(record.start_time).toLocaleDateString('en-IN')}
        </Text>
      </View>

      {record.location && (
        <View style={styles.infoRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{record.location}</Text>
        </View>
      )}

      {record.start_marked_at && (
        <View style={styles.infoRow}>
          <Text style={styles.label}>Start Time:</Text>
          <Text style={styles.value}>{formatDateTime(record.start_marked_at)}</Text>
        </View>
      )}

      {record.end_marked_at && (
        <View style={styles.infoRow}>
          <Text style={styles.label}>End Time:</Text>
          <Text style={styles.value}>{formatDateTime(record.end_marked_at)}</Text>
        </View>
      )}

      {record.duration_minutes && (
        <View style={styles.durationBox}>
          <Text style={styles.durationText}>
            Duration: {record.duration_minutes} minutes
          </Text>
        </View>
      )}
    </View>
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  owner: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: '#666',
    width: 110,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  durationBox: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default AttendanceCard;