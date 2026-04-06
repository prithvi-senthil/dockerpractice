import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ActivityDetailScreen from '../screens/ActivityDetailScreen';
import CreateActivityScreen from '../screens/CreateActivityScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import LeaveRequestScreen from '../screens/LeaveRequestScreen';
import MyLeavesScreen from '../screens/MyLeavesScreen';
import StudentListScreen from '../screens/StudentListScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const StudentTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: 'Activities' }} />
    <Tab.Screen name="MyAttendance" component={AttendanceHistoryScreen} options={{ tabBarLabel: 'Attendance' }} />
    <Tab.Screen name="MyLeaves" component={MyLeavesScreen} options={{ tabBarLabel: 'Leaves' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

const FacultyTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: 'Activities' }} />
    <Tab.Screen name="MyLeaves" component={MyLeavesScreen} options={{ tabBarLabel: 'Leave Requests' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

const AppStack = () => {
  const { user } = useAuth();
  const isFaculty = user?.user_type === 'faculty';

  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={isFaculty ? FacultyTabs : StudentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Activity Details' }} />
      {isFaculty && (
        <>
          <Stack.Screen name="CreateActivity" component={CreateActivityScreen} options={{ title: 'Create Activity' }} />
          <Stack.Screen name="StudentList" component={StudentListScreen} options={{ title: 'Enrolled Students' }} />
        </>
      )}
      {!isFaculty && (
        <Stack.Screen name="LeaveRequest" component={LeaveRequestScreen} options={{ title: 'Request Leave' }} />
      )}
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;