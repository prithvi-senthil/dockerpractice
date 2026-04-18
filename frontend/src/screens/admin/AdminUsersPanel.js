import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const AdminUsersPanel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [summary, setSummary] = useState({
    total_hods: 0,
    total_faculty: 0,
    total_students: 0,
  });
  const [hods, setHods] = useState([]); // For dropdown in faculty form

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("hod"); // For creating new users
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    report_to: "",
  });

  const USER_ROLE_COLORS = {
    hod: "#EF4444",
    faculty: "#F59E0B",
    student: "#10B981",
  };

  const USER_ROLE_LABELS = {
    hod: "HOD",
    faculty: "Faculty",
    student: "Student",
  };

  // Check if user is admin
  if (user?.user_type !== "admin") {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="lock-closed" size={48} color="#ff3b30" />
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>Only admins can manage users</Text>
      </View>
    );
  }

  // Fetch all users
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/users");

      setSummary(response.data.summary);
      const roleUsers = response.data.users_by_role;

      // Consolidate all users into one array with role info
      const combined = [];

      if (roleUsers.hod?.users) {
        combined.push(
          ...roleUsers.hod.users.map((u) => ({ ...u, role: "hod" })),
        );
      }
      if (roleUsers.faculty?.users) {
        combined.push(
          ...roleUsers.faculty.users.map((u) => ({ ...u, role: "faculty" })),
        );
      }
      if (roleUsers.student?.users) {
        combined.push(
          ...roleUsers.student.users.map((u) => ({ ...u, role: "student" })),
        );
      }

      setAllUsers(combined);
      filterUsersList(combined, searchQuery, activeFilter);

      // Extract HODs for the dropdown
      if (roleUsers.hod?.users) {
        setHods(roleUsers.hod.users);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to load users",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter users based on search and role
  const filterUsersList = (users, search, filter) => {
    let filtered = [...users];

    // Search filter
    if (search.trim()) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Role filter
    if (filter !== "all") {
      filtered = filtered.filter((u) => u.role === filter);
    }

    setFilteredUsers(filtered);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    filterUsersList(allUsers, text, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterUsersList(allUsers, searchQuery, filter);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllUsers();
  }, []);

  React.useEffect(() => {
    fetchAllUsers();
  }, []);

  // Handle create/edit
  const handleSaveUser = async () => {
    try {
      // Validation
      if (!formData.name || !formData.email) {
        Alert.alert("Validation Error", "Name and email are required");
        return;
      }

      // Role-specific validation
      if (!editingUser) {
        // Creating new user
        if (selectedRole === "hod") {
          if (!formData.department) {
            Alert.alert("Validation Error", "Department is required for HOD");
            return;
          }
        } else if (selectedRole === "faculty") {
          if (!formData.department) {
            Alert.alert(
              "Validation Error",
              "Department is required for Faculty",
            );
            return;
          }
          if (!formData.report_to) {
            Alert.alert(
              "Validation Error",
              "Please select a HOD for Faculty to report to",
            );
            return;
          }
        }
      } else {
        // Editing existing user
        if (editingUser.role === "hod" && !formData.department) {
          Alert.alert("Validation Error", "Department is required for HOD");
          return;
        }
        if (editingUser.role === "faculty") {
          if (!formData.department) {
            Alert.alert(
              "Validation Error",
              "Department is required for Faculty",
            );
            return;
          }
          if (!formData.report_to) {
            Alert.alert(
              "Validation Error",
              "Please select a HOD for Faculty to report to",
            );
            return;
          }
        }
      }

      setLoading(true);
      let url = "";
      let method = "post";
      const body = {
        name: formData.name,
        email: formData.email,
      };

      // Determine endpoint and method based on editing state and role
      if (editingUser) {
        // Update existing user
        if (editingUser.role === "hod") {
          url = `/admin/hods/${editingUser.id}`;
          method = "patch";
          body.department = formData.department;
        } else if (editingUser.role === "faculty") {
          url = `/admin/faculty/${editingUser.id}`;
          method = "patch";
          body.department = formData.department;
          body.report_to = formData.report_to;
        } else if (editingUser.role === "student") {
          url = `/admin/students/${editingUser.id}`;
          method = "patch";
        }
      } else {
        // Create new user based on selected role
        if (selectedRole === "hod") {
          url = "/admin/hods";
          body.department = formData.department;
        } else if (selectedRole === "faculty") {
          url = "/admin/faculty";
          body.department = formData.department;
          body.report_to = formData.report_to;
        } else if (selectedRole === "student") {
          url = "/admin/students";
        }
      }

      if (method === "post") {
        await api.post(url, body);
      } else {
        await api.patch(url, body);
      }

      Alert.alert(
        "Success",
        editingUser ? "User updated successfully" : "User created successfully",
      );
      resetForm();
      setShowAddModal(false);
      await fetchAllUsers();
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to save user",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              let endpoint = "";
              if (user.role === "hod") {
                endpoint = `/admin/hods/${user.id}`;
              } else if (user.role === "faculty") {
                endpoint = `/admin/faculty/${user.id}`;
              } else if (user.role === "student") {
                endpoint = `/admin/students/${user.id}`;
              }

              if (endpoint) {
                await api.delete(endpoint);
                Alert.alert("Success", "User deleted successfully");
                await fetchAllUsers();
              }
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete user",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setFormData({
      name: user.name,
      email: user.email,
      department: user.department || "",
      report_to: user.report_to ? user.report_to.toString() : "",
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setSelectedRole("hod");
    setFormData({
      name: "",
      email: "",
      department: "",
      report_to: "",
    });
  };

  const handleAddUser = () => {
    resetForm();
    setSelectedRole("hod"); // Default to HOD
    setShowAddModal(true);
  };

  const getRoleColor = (role) => USER_ROLE_COLORS[role] || "#666";

  const renderUserCard = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatarContainer}>
          <View
            style={[
              styles.userAvatar,
              { backgroundColor: getRoleColor(item.role) },
            ]}
          >
            <Text style={styles.avatarText}>
              {item.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userBasicInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.userMetadata}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Role:</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleColor(item.role) + "20" },
            ]}
          >
            <Text
              style={[styles.roleBadgeText, { color: getRoleColor(item.role) }]}
            >
              {USER_ROLE_LABELS[item.role]}
            </Text>
          </View>
        </View>

        {item.department && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Department:</Text>
            <Text style={styles.departmentText}>{item.department}</Text>
          </View>
        )}

        {item.report_to && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Reports To:</Text>
            <Text style={styles.reportText}>{item.report_to}</Text>
          </View>
        )}
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleEditUser(item)}
        >
          <Ionicons name="create" size={16} color="#7d53f6" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteUser(item)}
        >
          <Ionicons name="trash" size={16} color="#ff3b30" />
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing && allUsers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7d53f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Users</Text>
        <Text style={styles.headerSubtitle}>
          {filteredUsers.length} of {allUsers.length} users
        </Text>
        {/* Stats cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{summary.total_hods}</Text>
            <Text style={styles.statLabel}>HODs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{summary.total_faculty}</Text>
            <Text style={styles.statLabel}>Faculty</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{summary.total_students}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === "all" && styles.filterChipActive,
          ]}
          onPress={() => handleFilterChange("all")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "all" && styles.filterChipTextActive,
            ]}
          >
            All ({allUsers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === "hod" && styles.filterChipActive,
          ]}
          onPress={() => handleFilterChange("hod")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "hod" && styles.filterChipTextActive,
            ]}
          >
            HOD ({summary.total_hods})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === "faculty" && styles.filterChipActive,
          ]}
          onPress={() => handleFilterChange("faculty")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "faculty" && styles.filterChipTextActive,
            ]}
          >
            Faculty ({summary.total_faculty})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === "student" && styles.filterChipActive,
          ]}
          onPress={() => handleFilterChange("student")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "student" && styles.filterChipTextActive,
            ]}
          >
            Student ({summary.total_students})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubText}>
            {searchQuery.trim()
              ? "Try adjusting your search"
              : "No users in this category"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserCard}
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

      {/* Add/Edit User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? "Edit User" : "Add New User"}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Role Selector (only when creating new user) */}
              {!editingUser && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>User Role *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedRole}
                      onValueChange={setSelectedRole}
                      style={styles.picker}
                    >
                      <Picker.Item
                        label="HOD (Head of Department)"
                        value="hod"
                      />
                      <Picker.Item label="Faculty (Teacher)" value="faculty" />
                      <Picker.Item label="Student" value="student" />
                    </Picker>
                  </View>
                </View>
              )}

              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  keyboardType="email-address"
                  editable={!editingUser} // Email not editable when editing
                />
                {editingUser && (
                  <Text style={styles.helperText}>Email cannot be changed</Text>
                )}
              </View>

              {/* Department (for HOD and Faculty) */}
              {(selectedRole === "hod" || selectedRole === "faculty") && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    {selectedRole === "hod" ? "Department *" : "Department"}
                  </Text>
                  {selectedRole === "hod" ? (
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Computer Science"
                      value={formData.department}
                      onChangeText={(text) =>
                        setFormData({ ...formData, department: text })
                      }
                    />
                  ) : (
                    <View style={styles.input}>
                      <Text style={styles.departmentReadOnly}>
                        {formData.department || "Auto-filled by HOD"}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Reports To (for Faculty) - Shows HOD Names as Picker */}
              {(selectedRole === "faculty" ||
                editingUser?.role === "faculty") && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Reports To (HOD) *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.report_to}
                      onValueChange={(value) => {
                        setFormData({ ...formData, report_to: value });
                        // Auto-fill department from selected HOD
                        const selected = hods.find(
                          (h) => h.id.toString() === value,
                        );
                        if (selected) {
                          setFormData((prev) => ({
                            ...prev,
                            department: selected.department,
                          }));
                        }
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select a HOD..." value="" />
                      {hods.map((hod) => (
                        <Picker.Item
                          key={hod.id}
                          label={`${hod.name} (${hod.department})`}
                          value={hod.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>
                  {hods.length === 0 && (
                    <Text style={styles.helperText}>
                      No HODs available. Create a HOD first.
                    </Text>
                  )}
                </View>
              )}

              {!editingUser && (
                <Text style={styles.helperText}>
                  Password will be auto-generated and sent via email
                </Text>
              )}
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleSaveUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingUser ? "Update User" : "Create User"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB - Add User Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddUser}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 3,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 3,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7d53f6",
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    color: "#333",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
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
  usersList: {
    paddingVertical: 8,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  userCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 6,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  userAvatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  userBasicInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  userEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  userMetadata: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  departmentText: {
    fontSize: 12,
    color: "#666",
  },
  reportText: {
    fontSize: 12,
    color: "#666",
  },
  userActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#f3e8ff",
    gap: 6,
    minHeight: 40,
  },
  deleteBtn: {
    backgroundColor: "#fee2e2",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7d53f6",
    flexShrink: 1,
  },
  deleteBtnText: {
    color: "#ff3b30",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7d53f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  formContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  picker: {
    fontSize: 14,
    color: "#333",
  },
  departmentReadOnly: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#999",
  },
  helperText: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    fontStyle: "italic",
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  formBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#f5f5f5",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  saveBtn: {
    backgroundColor: "#7d53f6",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default AdminUsersPanel;
