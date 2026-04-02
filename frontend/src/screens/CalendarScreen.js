import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ActivityCard from '../components/ActivityCard';

const CalendarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [activities, setActivities] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isFaculty = user?.user_type === 'faculty';

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    // Update marked dates when activities change
    const marked = {};
    activities.forEach((activity) => {
      const date = activity.start_time.split('T')[0];
      marked[date] = { marked: true, dotColor: '#007AFF' };
    });
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#007AFF',
    };
    setMarkedDates(marked);
  }, [activities, selectedDate]);

  const fetchActivities = async (date = null) => {
    try {
      const params = date ? { date } : {};
      const response = await api.get('/activities', { params });
      setActivities(response.data);
    } catch (error) {
      console.error('Fetch activities error:', error);
      Alert.alert('Error', 'Failed to fetch activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities(selectedDate);
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    fetchActivities(day.dateString);
  };

  const filteredActivities = activities.filter((activity) => {
    const activityDate = activity.start_time.split('T')[0];
    return activityDate === selectedDate;
  });

  const renderActivity = ({ item }) => (
    <ActivityCard
      activity={item}
      onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activities</Text>
        {isFaculty && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateActivity')}
          >
            <Text style={styles.addButtonText}>+ Create</Text>
          </TouchableOpacity>
        )}
      </View>

      <Calendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#007AFF',
          selectedDayBackgroundColor: '#007AFF',
          dotColor: '#007AFF',
          arrowColor: '#007AFF',
        }}
      />

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {filteredActivities.length} activities on {selectedDate}
        </Text>
      </View>

      <FlatList
        data={filteredActivities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activities on this date</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listHeaderText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 15,
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

export default CalendarScreen;