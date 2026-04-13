import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import CalendarScreen from "../screens/attendance/CalendarScreen";
import ActivityDetailScreen from "../screens/activities/ActivityDetailScreen";
import CreateActivityScreen from "../screens/activities/CreateActivityScreen";
import AttendanceHistoryScreen from "../screens/attendance/AttendanceHistoryScreen";
import LeaveRequestScreen from "../screens/leaves/LeaveRequestScreen";
import MyLeavesScreen from "../screens/leaves/MyLeavesScreen";
import StudentListScreen from "../screens/admin/StudentListScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import NotificationScreen from "../screens/notifications/NotificationScreen";
import CourseAssignmentApprovalScreen from "../screens/faculty/CourseAssignmentApprovalScreen";
import StudentEnrollmentScreen from "../screens/admin/StudentEnrollmentScreen";
import InfrastructureManagementScreen from "../screens/InfrastructureManagementScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AuditLogsScreen from "../screens/AuditLogsScreen";
import UserManagementScreen from "../screens/UserManagementScreen";
import NotificationIcon from "../components/NotificationIcon";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Student View: Dashboard, Calendar, Attendance History, Leaves, Profile
const StudentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === "DashboardTab")
          iconName = focused ? "home" : "home-outline";
        else if (route.name === "CalendarTab")
          iconName = focused ? "calendar" : "calendar-outline";
        else if (route.name === "AttendanceTab")
          iconName = focused ? "list" : "list-outline";
        else if (route.name === "LeavesTab")
          iconName = focused ? "document-text" : "document-text-outline";
        else iconName = focused ? "person" : "person-outline";
        return <Ionicons name={iconName} size={size || 24} color={color} />;
      },
      tabBarActiveTintColor: "#7d53f6",
      tabBarInactiveTintColor: "#999",
      tabBarLabel:
        route.name === "DashboardTab"
          ? "Home"
          : route.name === "CalendarTab"
            ? "Calendar"
            : route.name === "AttendanceTab"
              ? "Attendance"
              : route.name === "LeavesTab"
                ? "Leaves"
                : "Profile",
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: "500",
        marginTop: 2,
      },
      tabBarStyle: {
        backgroundColor: "#fff",
        borderTopColor: "#eee",
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
    })}
  >
    <Tab.Screen
      name="DashboardTab"
      component={DashboardScreen}
      options={{ title: "Dashboard" }}
    />
    <Tab.Screen
      name="CalendarTab"
      component={CalendarScreen}
      options={{ title: "Calendar" }}
    />
    <Tab.Screen
      name="AttendanceTab"
      component={AttendanceHistoryScreen}
      options={{ title: "Attendance" }}
    />
    <Tab.Screen
      name="LeavesTab"
      component={LeaveRequestScreen}
      options={{ title: "My Leaves" }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{ title: "Profile" }}
    />
  </Tab.Navigator>
);

// Faculty View: Dashboard, Calendar, Leave Requests, Profile
const FacultyTabs = () => (
  <Tab.Navigator
    screenOptions={({ route, navigation }) => ({
      headerShown: true,
      headerStyle: { backgroundColor: "#fff" },
      headerTintColor: "#7d53f6",
      headerTitleStyle: { fontWeight: "700", fontSize: 18 },
      tabBarShowLabel: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === "DashboardTab")
          iconName = focused ? "home" : "home-outline";
        else if (route.name === "CalendarTab")
          iconName = focused ? "calendar" : "calendar-outline";
        else if (route.name === "LeavesTab")
          iconName = focused ? "document-text" : "document-text-outline";
        else iconName = focused ? "person" : "person-outline";
        return <Ionicons name={iconName} size={size || 24} color={color} />;
      },
      tabBarActiveTintColor: "#7d53f6",
      tabBarInactiveTintColor: "#999",
      tabBarLabel:
        route.name === "DashboardTab"
          ? "Home"
          : route.name === "CalendarTab"
            ? "Calendar"
            : route.name === "LeavesTab"
              ? "Leave Requests"
              : "Profile",
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: "500",
        marginTop: 2,
      },
      tabBarStyle: {
        backgroundColor: "#fff",
        borderTopColor: "#eee",
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      headerRight: () => (
        <NotificationIcon
          onPress={() => navigation.navigate("Notifications")}
          tintColor="#7d53f6"
        />
      ),
    })}
  >
    <Tab.Screen
      name="DashboardTab"
      component={DashboardScreen}
      options={{ title: "Dashboard" }}
    />
    <Tab.Screen
      name="CalendarTab"
      component={CalendarScreen}
      options={{ title: "Calendar" }}
    />
    <Tab.Screen
      name="LeavesTab"
      component={MyLeavesScreen}
      options={{ title: "Leave Requests" }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{ title: "Profile" }}
    />
  </Tab.Navigator>
);

// Admin View: Dashboard (with integrated admin panel), Calendar, Profile
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route, navigation }) => ({
      headerShown: true,
      headerStyle: { backgroundColor: "#fff" },
      headerTintColor: "#7d53f6",
      headerTitleStyle: { fontWeight: "700", fontSize: 18 },
      tabBarShowLabel: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === "DashboardTab")
          iconName = focused ? "home" : "home-outline";
        else if (route.name === "CalendarTab")
          iconName = focused ? "calendar" : "calendar-outline";
        else iconName = focused ? "person" : "person-outline";
        return <Ionicons name={iconName} size={size || 24} color={color} />;
      },
      tabBarActiveTintColor: "#7d53f6",
      tabBarInactiveTintColor: "#999",
      tabBarLabel:
        route.name === "DashboardTab"
          ? "Home"
          : route.name === "CalendarTab"
            ? "Calendar"
            : "Profile",
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: "500",
        marginTop: 2,
      },
      tabBarStyle: {
        backgroundColor: "#fff",
        borderTopColor: "#eee",
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      headerRight: () => (
        <NotificationIcon
          onPress={() => navigation.navigate("Notifications")}
          tintColor="#7d53f6"
        />
      ),
    })}
  >
    <Tab.Screen
      name="DashboardTab"
      component={DashboardScreen}
      options={{ title: "Admin Dashboard" }}
    />
    <Tab.Screen
      name="CalendarTab"
      component={CalendarScreen}
      options={{ title: "Calendar" }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{ title: "Profile" }}
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

      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          title: "Notifications",
          headerStyle: { backgroundColor: "#f5f5f5" },
          headerTintColor: "#7d53f6",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      {/* Faculty Screens */}
      <Stack.Screen
        name="CourseAssignmentApproval"
        component={CourseAssignmentApprovalScreen}
        options={{
          title: "Course Assignments",
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#7d53f6",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      {/* Admin Screens */}
      <Stack.Screen
        name="StudentEnrollment"
        component={StudentEnrollmentScreen}
        options={{
          title: "Enroll Students",
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#7d53f6",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      <Stack.Screen
        name="InfrastructureManagementScreen"
        component={InfrastructureManagementScreen}
        options={{
          title: "Infrastructure Management",
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#7d53f6",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          title: "System Settings",
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#7d53f6",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      <Stack.Screen
        name="AuditLogsScreen"
        component={AuditLogsScreen}
        options={{
          title: "Audit Logs",
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#7d53f6",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      <Stack.Screen
        name="UserManagementScreen"
        component={UserManagementScreen}
        options={{
          title: "User Management",
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: "#7d53f6",
          headerTitleStyle: { fontWeight: "700" },
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
