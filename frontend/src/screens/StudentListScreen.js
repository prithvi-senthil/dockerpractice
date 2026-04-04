import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../services/api';

const StudentListScreen = ({ route }) => {
  const { activityId } = route.params;
  const [students, setStudents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/activities/${activityId}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error('Fetch students error:', error);
      Alert.alert('Error', 'Failed to fetch students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const getAttendanceStatus = (status) => {
    if (!status) return { text: 'Not Marked', color: '#999' };
    switch (status) {
      case 'present':
        return { text: 'Present', color: '#34C759' };
      case 'absent':
        return { text: 'Absent', color: '#FF3B30' };
      case 'on_leave':
        return { text: 'On Leave', color: '#FF9500' };
      default:
        return { text: status, color: '#666' };
    }
  };

  const renderStudent = ({ item }) => {
    const attendanceStatus = getAttendanceStatus(item.attendance_status);

    return (
      <View style={styles.card}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: attendanceStatus.color }]}>
          <Text style={styles.statusText}>{attendanceStatus.text}</Text>
        </View>

        {item.start_marked_at && (
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Start:</Text>
            <Text style={styles.timeValue}>
              {new Date(item.start_marked_at).toLocaleTimeString('en-IN')}
            </Text>
          </View>
        )}

        {item.end_marked_at && (
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>End:</Text>
            <Text style={styles.timeValue}>
              {new Date(item.end_marked_at).toLocaleTimeString('en-IN')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students enrolled</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 15,
  },
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
  studentInfo: {
    marginBottom: 10,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeInfo: {
    flexDirection: 'row',
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    width: 50,
  },
  timeValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default StudentListScreen;