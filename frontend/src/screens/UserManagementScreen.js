import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../services/api";

const UserManagementScreen = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Add User Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    user_type: "student",
    department: "",
  });

  const USER_TYPES = {
    admin: "Admin",
    faculty: "Faculty",
    student: "Student",
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchText, selectedFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/admin/users");
      const allUsers = [];
      const userData = response.data.users_by_role || {};

      Object.keys(userData).forEach((role) => {
        const roleUsers = userData[role]?.users || [];
        allUsers.push(...roleUsers.map((u) => ({ ...u, role })));
      });

      setUsers(allUsers);
    } catch (error) {
      console.error("Fetch users error:", error);
      setUsers([
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          user_type: "admin",
          department: "Administration",
          role: "admin",
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          user_type: "faculty",
          department: "Science",
          role: "faculty",
        },
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          user_type: "student",
          department: null,
          role: "student",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await API.get("/departments");
      setDepartments(response.data.departments || response.data.data || []);
    } catch (error) {
      console.error("Fetch departments error:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchText.trim()) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    if (selectedFilter !== "all") {
      filtered = filtered.filter((u) => u.user_type === selectedFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleAddUser = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert("Error", "Name and email are required");
      return;
    }

    try {
      setAddingUser(true);
      const payload = {
        name: formData.name,
        email: formData.email,
        user_type: formData.user_type,
        ...(formData.user_type !== "student" && {
          department: formData.department,
        }),
      };

      await API.post("/admin/users", payload);
      Alert.alert("Success", "User created successfully");
      setShowAddModal(false);
      setFormData({ name: "", email: "", user_type: "student", department: "" });
      fetchUsers();
    } catch (error) {
      console.error("Add user error:", error);
      Alert.alert("Error", error.response?.data?.error || "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: getUserColor(item.user_type) }]}>
            <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.userMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Type:</Text>
          <View style={[styles.typeBadge, { backgroundColor: getUserColor(item.user_type) + "20" }]}>
            <Text style={[styles.typeBadgeText, { color: getUserColor(item.user_type) }]}>
              {USER_TYPES[item.user_type] || item.user_type}
            </Text>
          </View>
        </View>
        {item.department && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Department:</Text>
            <Text style={styles.metaValue}>{item.department}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const getUserColor = (userType) => {
    const colors = {
      admin: "#EF4444",
      faculty: "#F59E0B",
      student: "#10B981",
    };
    return colors[userType] || "#6B7280";
  };

  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7d53f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Professional Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Users</Text>
            <Text style={styles.headerSubtitle}>
              Manage all users and their roles
            </Text>
          </View>
          <View style={styles.userCountBadge}>
            <Text style={styles.userCountText}>{users.length}</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>USER TYPE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterTabs}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === "all" && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === "all" && styles.filterChipTextActive,
              ]}
            >
              All ({users.length})
            </Text>
          </TouchableOpacity>

          {Object.entries(USER_TYPES).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                selectedFilter === key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === key && styles.filterChipTextActive,
                ]}
              >
                {label} ({users.filter((u) => u.user_type === key).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people" size={56} color="#DDD" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>
            {searchText.trim()
              ? "Try adjusting your search criteria"
              : "Start by adding a new user"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7d53f6"
            />
          }
          contentContainerStyle={styles.usersList}
          scrollEnabled={true}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <View style={styles.fabIcon}>
          <Ionicons name="person-add" size={24} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Add User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New User</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Name Field */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="John Doe"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholderTextColor="#CCC"
              />
            </View>

            {/* Email Field */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email Address *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="john@example.com"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                placeholderTextColor="#CCC"
              />
              <Text style={styles.formHelper}>A confirmation email will be sent</Text>
            </View>

            {/* User Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>User Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.user_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, user_type: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Student" value="student" />
                  <Picker.Item label="Faculty" value="faculty" />
                  <Picker.Item label="Admin" value="admin" />
                </Picker>
              </View>
            </View>

            {/* Department (for Faculty/Admin) */}
            {(formData.user_type === "faculty" || formData.user_type === "admin") && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Department *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.department}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department: value })
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a department" value="" />
                    {departments.map((dept) => (
                      <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            <View style={styles.spacer} />
          </ScrollView>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddModal(false)}
              disabled={addingUser}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.addButton]}
              onPress={handleAddUser}
              disabled={addingUser}
            >
              {addingUser ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Add User</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header Styles
  headerSection: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    fontWeight: "500",
  },
  userCountBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7d53f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7d53f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userCountText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },

  // Search Bar
  searchBarSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#333",
  },

  // Filter Section
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  filterTabs: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterChipActive: {
    backgroundColor: "#7d53f6",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  // User List
  usersList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userHeader: {
    marginBottom: 12,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  userEmail: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  userMeta: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7d53f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7d53f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  fabIcon: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 9,
  },
  formInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a1a",
  },
  formHelper: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    fontStyle: "italic",
  },
  pickerContainer: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  spacer: {
    height: 20,
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  addButton: {
    backgroundColor: "#7d53f6",
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

export default UserManagementScreen;
