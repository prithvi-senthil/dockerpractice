import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  Picker,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const LeaveRequestScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState('medical');
  const [loading, setLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);

  const leaveTypes = [
    { label: 'Medical', value: 'medical' },
    { label: 'Personal', value: 'personal' },
    { label: 'Family Emergency', value: 'emergency' },
    { label: 'Other', value: 'other' },
  ];

  useEffect(() => {
    fetchLeaveInfo();
  }, []);

  const fetchLeaveInfo = async () => {
    try {
      const response = await api.get('/leave/statistics');
      setLeaveBalance(response.data);
      
      const historyResponse = await api.get('/leave/my-requests');
      setLeaveHistory(historyResponse.data);
    } catch (error) {
      console.error('Fetch leave info error:', error);
    }
  };

  const calculateDays = () => {
    const diffTime = Math.abs(toDate - fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please enter a reason for leave');
      return;
    }

    if (toDate < fromDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        from_date: fromDate.toISOString().split('T')[0],
        to_date: toDate.toISOString().split('T')[0],
        reason,
        leave_type: leaveType,
      };

      await api.post('/leave/request', payload);

      Alert.alert('Success', 'Leave request submitted!', [
        {
          text: 'OK',
          onPress: () => {
            setReason('');
            setFromDate(new Date());
            setToDate(new Date());
            fetchLeaveInfo();
          },
        },
      ]);
    } catch (error) {
      console.error('Submit leave error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#d32f2f';
      case 'pending':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Leave Balance */}
      {leaveBalance && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>📊 Leave Balance</Text>
          
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Total Days:</Text>
            <Text style={styles.balanceValue}>{leaveBalance.total_leaves || 0}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Used:</Text>
            <Text style={styles.balanceValue}>{leaveBalance.leaves_used || 0}</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Remaining:</Text>
            <Text style={[styles.balanceValue, { color: '#4CAF50' }]}>
              {(leaveBalance.total_leaves || 0) - (leaveBalance.leaves_used || 0)}
            </Text>
          </View>

          {leaveBalance.leave_percentage !== undefined && (
            <View style={styles.percentageBox}>
              <Text style={styles.percentageText}>
                Leave Percentage: {leaveBalance.leave_percentage.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Leave Request Form */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📝 Request Leave</Text>

        <Text style={styles.label}>From Date *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowFromPicker(true)}
        >
          <Text style={styles.dateText}>{fromDate.toDateString()}</Text>
        </TouchableOpacity>

        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowFromPicker(Platform.OS === 'ios');
              if (date) setFromDate(date);
            }}
          />
        )}

        <Text style={styles.label}>To Date *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowToPicker(true)}
        >
          <Text style={styles.dateText}>{toDate.toDateString()}</Text>
        </TouchableOpacity>

        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowToPicker(Platform.OS === 'ios');
              if (date) setToDate(date);
            }}
          />
        )}

        <View style={styles.daysBox}>
          <Text style={styles.daysText}>Total Days: {calculateDays()}</Text>
        </View>

        <Text style={styles.label}>Leave Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={leaveType}
            onValueChange={setLeaveType}
            style={styles.picker}
          >
            {leaveTypes.map((type) => (
              <Picker.Item key={type.value} label={type.label} value={type.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Reason *</Text>
        <TextInput
          style={[styles.input, styles.reasonInput]}
          placeholder="Enter reason for leave"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leave History */}
      {leaveHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Leave History</Text>

          {leaveHistory.map((leave) => (
            <View key={leave.id} style={styles.leaveItem}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveDates}>
                  {leave.from_date} to {leave.to_date}
                </Text>
                <Text
                  style={[
                    styles.leaveStatus,
                    { backgroundColor: getStatusColor(leave.status) },
                  ]}
                >
                  {leave.status?.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.leaveType}>{leave.leave_type}</Text>
              {leave.reason && (
                <Text style={styles.leaveReason}>Reason: {leave.reason}</Text>
              )}

              {leave.admin_remarks && (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksLabel}>Remarks:</Text>
                  <Text style={styles.remarksText}>{leave.admin_remarks}</Text>
                </View>
              )}
            </View>
          ))}
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
  balanceCard: {
    backgroundColor: '#E3F2FD',
    margin: 12,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '700',
  },
  percentageBox: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  percentageText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  daysBox: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 6,
    marginVertical: 12,
  },
  daysText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
  },
  reasonInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  leaveItem: {
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveDates: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  leaveStatus: {
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  leaveType: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  leaveReason: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  remarksBox: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  remarksLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6F00',
  },
  remarksText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default LeaveRequestScreen;
