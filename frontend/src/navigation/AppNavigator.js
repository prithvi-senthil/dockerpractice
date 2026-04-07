import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import CalendarScreen from "../screens/CalendarScreen";
import ActivityDetailScreen from "../screens/ActivityDetailScreen";
import CreateActivityScreen from "../screens/CreateActivityScreen";
import AttendanceHistoryScreen from "../screens/AttendanceHistoryScreen";
import LeaveRequestScreen from "../screens/LeaveRequestScreen";
import MyLeavesScreen from "../screens/MyLeavesScreen";
import StudentListScreen from "../screens/StudentListScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Student View: Calendar, Attendance History, Leaves, Profile
const StudentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarLabel: route.name === "CalendarTab" ? "📅 Calendar" : 
                   route.name === "AttendanceTab" ? "📋 Attendance" :
                   route.name === "LeavesTab" ? "📝 Leaves" : "👤 Profile",
    })}
  >
    <Tab.Screen
      name="CalendarTab"
      component={CalendarScreen}
      options={{
        tabBarLabel: "📅 Calendar",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
    <Tab.Screen
      name="AttendanceTab"
      component={AttendanceHistoryScreen}
      options={{
        tabBarLabel: "📋 Attendance",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
    <Tab.Screen
      name="LeavesTab"
      component={LeaveRequestScreen}
      options={{
        tabBarLabel: "📝 Leaves",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        tabBarLabel: "👤 Profile",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
  </Tab.Navigator>
);

// Faculty View: Calendar, Leave Requests, Profile
const FacultyTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarLabel: route.name === "CalendarTab" ? "📅 Calendar" : 
                   route.name === "LeavesTab" ? "📝 Leave Requests" : "👤 Profile",
    })}
  >
    <Tab.Screen
      name="CalendarTab"
      component={CalendarScreen}
      options={{
        tabBarLabel: "📅 Calendar",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
    <Tab.Screen
      name="LeavesTab"
      component={MyLeavesScreen}
      options={{
        tabBarLabel: "📝 Leave Requests",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        tabBarLabel: "👤 Profile",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
  </Tab.Navigator>
);

// Admin View: Calendar, CreateCourse, Profile
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarLabel: route.name === "CalendarTab" ? "📅 Calendar" : 
                   route.name === "CreateTab" ? "➕ Create Course" : "👤 Profile",
    })}
  >
    <Tab.Screen
      name="CalendarTab"
      component={CalendarScreen}
      options={{
        tabBarLabel: "📅 Calendar",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
    <Tab.Screen
      name="CreateTab"
      component={CreateActivityScreen}
      options={{
        tabBarLabel: "➕ Create",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        tabBarLabel: "👤 Profile",
        tabBarActiveTintColor: "#1976D2",
      }}
    />
  </Tab.Navigator>
);

const AppStack = () => {
  const { user } = useAuth();

  let MainTabs;
  switch (user?.user_type) {
    case "admin":
      MainTabs = AdminTabs;
      break;
    case "faculty":
      MainTabs = FacultyTabs;
      break;
    default:
      MainTabs = StudentTabs;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Shared Screens */}
      <Stack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{
          title: "Session Details",
          headerStyle: { backgroundColor: "#f5f5f5" },
          headerTintColor: "#1976D2",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      <Stack.Screen
        name="StudentList"
        component={StudentListScreen}
        options={{
          title: "Course Students",
          headerStyle: { backgroundColor: "#f5f5f5" },
          headerTintColor: "#1976D2",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
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
