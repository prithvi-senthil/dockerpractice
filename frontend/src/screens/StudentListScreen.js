import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StudentListScreen = ({ route }) => {
  const { courseId, sessionId } = route.params;
  const { user } = useAuth();
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const endpoint = courseId
        ? `/activities/courses/${courseId}/students`
        : `/activities/sessions/${sessionId}/students`;
      
      const response = await api.get(endpoint);
      setStudents(response.data);
    } catch (error) {
      console.error('Fetch students error:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
    setRefreshing(false);
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    Alert.alert(
      'Remove Student',
      `Remove ${studentName} from this course?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // This endpoint may need to be implemented in backend
              await api.post(`/activities/courses/${courseId}/remove-student`, {
                student_id: studentId,
              });
              Alert.alert('Success', 'Student removed');
              fetchStudents();
            } catch (error) {
              console.error('Remove student error:', error);
              Alert.alert('Error', 'Failed to remove student');
            }
          },
        },
      ]
    );
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchText.toLowerCase()) ||
      student.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>

        {/* Show attendance info if available */}
        {item.attendance_status && (
          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceLabel}>Status:</Text>
            <Text
              style={[
                styles.attendanceStatus,
                {
                  color:
                    item.attendance_status === 'present'
                      ? '#4CAF50'
                      : item.attendance_status === 'absent'
                      ? '#d32f2f'
                      : '#FF9800',
                },
              ]}
            >
              {item.attendance_status?.toUpperCase()}
            </Text>
          </View>
        )}

        {item.start_marked_at && (
          <Text style={styles.attendanceTime}>
            ✓ Marked: {new Date(item.start_marked_at).toLocaleTimeString('en-IN')}
          </Text>
        )}

        {item.duration_minutes && (
          <Text style={styles.duration}>⏱️ Duration: {item.duration_minutes} min</Text>
        )}
      </View>

      {user?.user_type !== 'student' && courseId && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemoveStudent(item.id, item.name)}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Student Count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {filteredStudents.length} / {students.length} students
        </Text>
      </View>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText ? '😢 No students found' : '📭 No students enrolled'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  countBar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  countText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 6,
  },
  attendanceStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  attendanceTime: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  removeBtn: {
    backgroundColor: '#d32f2f',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default StudentListScreen;
