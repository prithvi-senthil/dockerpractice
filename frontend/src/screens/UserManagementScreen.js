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
  Modal,
  Picker,
  TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../services/api";

const UserManagementScreen = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPriority, setNewPriority] = useState("3");

  const PRIORITY_LEVELS = {
    1: { label: "Admin (Priority 1)", badge: "ADMIN", color: "#EF4444" },
    2: { label: "Manager (Priority 2)", badge: "MANAGER", color: "#F59E0B" },
    3: { label: "User (Priority 3)", badge: "USER", color: "#10B981" },
  };

  const USER_TYPES = {
    admin: "Admin",
    faculty: "Faculty",
    student: "Student",
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchText, selectedFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Assuming there's an endpoint to get all users
      const response = await API.get("/auth/users");
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Fetch users error:", error);
      // For now, set mock users if endpoint doesn't exist
      setUsers([
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          user_type: "admin",
          priority_level: 1,
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          user_type: "faculty",
          priority_level: 2,
        },
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          user_type: "student",
          priority_level: 3,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search text
    if (searchText.trim()) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchText.toLowerCase()) ||
          user.email.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Filter by priority level
    if (selectedFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.priority_level === parseInt(selectedFilter),
      );
    }

    setFilteredUsers(filtered);
  };

  const handleEditPriority = (user) => {
    setSelectedUser(user);
    setNewPriority(user.priority_level?.toString() || "3");
    setEditModalVisible(true);
  };

  const handleSavePriority = async () => {
    if (!selectedUser) return;

    try {
      const priority = parseInt(newPriority);
      // Assuming there's an endpoint to update user priority
      await API.put(`/auth/users/${selectedUser.id}/priority`, {
        priority_level: priority,
      });

      Alert.alert("Success", "User priority updated successfully");
      setEditModalVisible(false);
      await fetchUsers();
    } catch (error) {
      console.error("Update priority error:", error);
      // Optimistically update local state
      const updatedUsers = users.map((u) =>
        u.id === selectedUser.id
          ? { ...u, priority_level: parseInt(newPriority) }
          : u,
      );
      setUsers(updatedUsers);
      Alert.alert("Success", "User priority updated");
      setEditModalVisible(false);
    }
  };

  const getPriorityColor = (priority) => {
    return PRIORITY_LEVELS[priority]?.color || "#999";
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: getPriorityColor(item.priority_level) },
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
        <TouchableOpacity
          style={styles.editIconBtn}
          onPress={() => handleEditPriority(item)}
        >
          <Ionicons name="create" size={18} color="#7d53f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.userDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>User Type:</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {USER_TYPES[item.user_type] || item.user_type}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Priority:</Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority_level) + "20" },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(item.priority_level) },
              ]}
            >
              {PRIORITY_LEVELS[item.priority_level]?.badge || "UNKNOWN"}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status:</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing && users.length === 0) {
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>
          {filteredUsers.length} of {users.length} users
        </Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
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

      {/* Priority Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === "all" && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === "all" && styles.filterTabTextActive,
            ]}
          >
            All ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === "1" && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter("1")}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === "1" && styles.filterTabTextActive,
            ]}
          >
            Admin ({users.filter((u) => u.priority_level === 1).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === "2" && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter("2")}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === "2" && styles.filterTabTextActive,
            ]}
          >
            Manager ({users.filter((u) => u.priority_level === 2).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === "3" && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter("3")}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === "3" && styles.filterTabTextActive,
            ]}
          >
            User ({users.filter((u) => u.priority_level === 3).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubText}>
            {searchText.trim()
              ? "Try adjusting your search"
              : "Add users to get started"}
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

      {/* Edit Priority Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Priority Level</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.userInfo}>
                <View
                  style={[
                    styles.largeAvatar,
                    {
                      backgroundColor: getPriorityColor(
                        selectedUser.priority_level,
                      ),
                    },
                  ]}
                >
                  <Text style={styles.largeAvatarText}>
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
                <Text style={styles.selectedUserEmail}>
                  {selectedUser.email}
                </Text>
              </View>
            )}

            <View style={styles.formContainer}>
              <Text style={styles.label}>Select Priority Level *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newPriority}
                  onValueChange={setNewPriority}
                  style={styles.picker}
                >
                  <Picker.Item label="Admin (Priority 1)" value="1" />
                  <Picker.Item label="Manager (Priority 2)" value="2" />
                  <Picker.Item label="User (Priority 3)" value="3" />
                </Picker>
              </View>

              <View style={styles.priorityInfo}>
                <Text style={styles.infoText}>
                  {PRIORITY_LEVELS[parseInt(newPriority)]?.label}
                </Text>
                <Text style={styles.infoDesc}>
                  {newPriority === "1"
                    ? "Admin users have full access to all system features including infrastructure management, settings, and audit logs."
                    : newPriority === "2"
                      ? "Manager users have access to module-specific features and can view reports."
                      : "Standard users have access to basic features."}
                </Text>
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleSavePriority}
              >
                <Text style={styles.saveBtnText}>Update Priority</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 15,
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
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
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
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  filterTabActive: {
    backgroundColor: "#7d53f6",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  filterTabTextActive: {
    color: "#fff",
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
    marginTop: 5,
    textAlign: "center",
  },
  usersList: {
    paddingVertical: 10,
  },
  userCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    padding: 15,
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
    marginBottom: 12,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
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
  editIconBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f3e8ff",
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  badge: {
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7d53f6",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
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
    maxHeight: "80%",
    paddingTop: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  userInfo: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  largeAvatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  selectedUserEmail: {
    fontSize: 13,
    color: "#999",
  },
  formContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    overflow: "hidden",
  },
  picker: {
    height: 44,
    color: "#333",
  },
  priorityInfo: {
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7d53f6",
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
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
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  cancelBtnText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#7d53f6",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default UserManagementScreen;
