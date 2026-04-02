import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import OTPInput from '../components/OTPInput';

const ActivityDetailScreen = ({ route, navigation }) => {
  const { activityId } = route.params;
  const { user } = useAuth();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startOTP, setStartOTP] = useState('');
  const [endOTP, setEndOTP] = useState('');
  const [generatedStartOTP, setGeneratedStartOTP] = useState('');
  const [generatedEndOTP, setGeneratedEndOTP] = useState('');

  const isFaculty = user?.user_type === 'faculty';

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const response = await api.get(`/activities/${activityId}`);
      setActivity(response.data);
    } catch (error) {
      console.error('Fetch activity error:', error);
      Alert.alert('Error', 'Failed to fetch activity details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStartOTP = async () => {
    try {
      const response = await api.post(`/activities/${activityId}/generate-start-otp`);
      setGeneratedStartOTP(response.data.otp);
      Alert.alert('Start OTP Generated', `OTP: ${response.data.otp}\nValid for 10 minutes`);
      fetchActivity(); // Refresh activity status
    } catch (error) {
      console.error('Generate start OTP error:', error);
      Alert.alert('Error', 'Failed to generate start OTP');
    }
  };

  const handleGenerateEndOTP = async () => {
    try {
      const response = await api.post(`/activities/${activityId}/generate-end-otp`);
      setGeneratedEndOTP(response.data.otp);
      Alert.alert('End OTP Generated', `OTP: ${response.data.otp}\nValid for 10 minutes`);
      fetchActivity(); // Refresh activity status
    } catch (error) {
      console.error('Generate end OTP error:', error);
      Alert.alert('Error', 'Failed to generate end OTP');
    }
  };

  const handleMarkStartAttendance = async () => {
    if (startOTP.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    try {
      await api.post('/attendance/mark-start', {
        activityId,
        otp: startOTP,
      });
      Alert.alert('Success', 'Start attendance marked!');
      setStartOTP('');
    } catch (error) {
      console.error('Mark start error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const handleMarkEndAttendance = async () => {
    if (endOTP.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    try {
      const response = await api.post('/attendance/mark-end', {
        activityId,
        otp: endOTP,
      });
      Alert.alert('Success', `End attendance marked! Duration: ${response.data.duration}`);
      setEndOTP('');
    } catch (error) {
      console.error('Mark end error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark end attendance');
    }
  };

  const handleViewStudents = () => {
    navigation.navigate('StudentList', { activityId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Activity not found</Text>
      </View>
    );
  }

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{activity.title}</Text>
        {activity.description && (
          <Text style={styles.description}>{activity.description}</Text>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Owner:</Text>
          <Text style={styles.value}>{activity.owner_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Start Time:</Text>
          <Text style={styles.value}>{formatDateTime(activity.start_time)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>End Time:</Text>
          <Text style={styles.value}>{formatDateTime(activity.end_time)}</Text>
        </View>

        {activity.location && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{activity.location}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, styles.statusText, styles[`status${activity.status}`]]}>
            {activity.status.toUpperCase()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Enrolled:</Text>
          <Text style={styles.value}>
            {activity.enrolled_count} / {activity.max_students}
          </Text>
        </View>
      </View>

      {/* Faculty Controls */}
      {isFaculty && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Faculty Controls</Text>

          <TouchableOpacity style={styles.button} onPress={handleGenerateStartOTP}>
            <Text style={styles.buttonText}>Generate Start OTP</Text>
          </TouchableOpacity>

          {generatedStartOTP && (
            <View style={styles.otpDisplay}>
              <Text style={styles.otpLabel}>Start OTP:</Text>
              <Text style={styles.otpValue}>{generatedStartOTP}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleGenerateEndOTP}>
            <Text style={styles.buttonText}>Generate End OTP</Text>
          </TouchableOpacity>

          {generatedEndOTP && (
            <View style={styles.otpDisplay}>
              <Text style={styles.otpLabel}>End OTP:</Text>
              <Text style={styles.otpValue}>{generatedEndOTP}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleViewStudents}>
            <Text style={styles.secondaryButtonText}>View Enrolled Students</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Student Controls */}
      {!isFaculty && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mark Attendance</Text>

          <Text style={styles.otpLabel}>Enter Start OTP:</Text>
          <OTPInput value={startOTP} onChange={setStartOTP} />
          <TouchableOpacity style={styles.button} onPress={handleMarkStartAttendance}>
            <Text style={styles.buttonText}>Mark Start Attendance</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.otpLabel}>Enter End OTP:</Text>
          <OTPInput value={endOTP} onChange={setEndOTP} />
          <TouchableOpacity style={styles.button} onPress={handleMarkEndAttendance}>
            <Text style={styles.buttonText}>Mark End Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.leaveButton]}
            onPress={() => navigation.navigate('LeaveRequest', { activityId })}
          >
            <Text style={styles.buttonText}>Request Leave</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusscheduled: {
    color: '#FF9500',
  },
  statusongoing: {
    color: '#34C759',
  },
  statuscompleted: {
    color: '#8E8E93',
  },
  statuscancelled: {
    color: '#FF3B30',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#FF9500',
  },
  otpDisplay: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  otpValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
});

export default ActivityDetailScreen;