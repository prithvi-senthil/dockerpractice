import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// Screens
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Student Bottom Tabs
const StudentTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen 
      name="Calendar" 
      component={CalendarScreen} 
      options={{ tabBarLabel: 'Activities' }} 
    />
    <Tab.Screen 
      name="MyAttendance" 
      component={AttendanceHistoryScreen} 
      options={{ tabBarLabel: 'Attendance' }} 
    />
    <Tab.Screen 
      name="MyLeaves" 
      component={MyLeavesScreen} 
      options={{ tabBarLabel: 'Leaves' }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ tabBarLabel: 'Profile' }} 
    />
  </Tab.Navigator>
);

// Faculty Bottom Tabs
const FacultyTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen 
      name="Calendar" 
      component={CalendarScreen} 
      options={{ tabBarLabel: 'Activities' }} 
    />
    <Tab.Screen 
      name="MyLeaves" 
      component={MyLeavesScreen} 
      options={{ tabBarLabel: 'Leave Requests' }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ tabBarLabel: 'Profile' }} 
    />
  </Tab.Navigator>
);

// Main App Stack
const AppStack = () => {
  const { user } = useAuth();
  const isFaculty = user?.user_type === 'faculty';

  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Home" 
        component={isFaculty ? FacultyTabs : StudentTabs} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ActivityDetail" 
        component={ActivityDetailScreen} 
        options={{ title: 'Activity Details' }} 
      />
      {isFaculty && (
        <>
          <Stack.Screen 
            name="CreateActivity" 
            component={CreateActivityScreen} 
            options={{ title: 'Create Activity' }} 
          />
          <Stack.Screen 
            name="StudentList" 
            component={StudentListScreen} 
            options={{ title: 'Enrolled Students' }} 
          />
        </>
      )}
      {!isFaculty && (
        <Stack.Screen 
          name="LeaveRequest" 
          component={LeaveRequestScreen} 
          options={{ title: 'Request Leave' }} 
        />
      )}
    </Stack.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;