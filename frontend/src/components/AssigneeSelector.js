import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { userAPI } from "../services/api";

const AssigneeSelector = ({
  visible,
  selectedIds,
  onSelectionChange,
  onClose,
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds || []);

  useEffect(() => {
    if (visible) {
      loadUsers();
      setLocalSelectedIds(selectedIds || []);
    }
  }, [visible, selectedIds]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getAssignableUsers({ limit: 100 });
      setUsers(response || []);
    } catch (error) {
      console.error("Load assignee users error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId) => {
    setLocalSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleConfirm = () => {
    // Build user details for chips
    const selectedUsers = localSelectedIds.map((id) => {
      const user = users.find((u) => u.id === id);
      return {
        id,
        name: user?.name || `User #${id}`,
        userType: "HUMAN",
      };
    });
    onSelectionChange(localSelectedIds, selectedUsers);
    onClose();
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#7d53f6" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Assign Faculty</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={localSelectedIds.length === 0}
          >
            <Ionicons
              name="checkmark-done"
              size={24}
              color={localSelectedIds.length === 0 ? "#ccc" : "#7d53f6"}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7d53f6" />
          </View>
        ) : (
          <ScrollView style={styles.usersList}>
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={48} color="#ddd" />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : (
              filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userItem,
                    localSelectedIds.includes(user.id) &&
                      styles.userItemSelected,
                  ]}
                  onPress={() => toggleUser(user.id)}
                >
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <Ionicons
                    name={
                      localSelectedIds.includes(user.id)
                        ? "checkbox"
                        : "checkbox-outline"
                    }
                    size={24}
                    color={
                      localSelectedIds.includes(user.id) ? "#7d53f6" : "#ccc"
                    }
                  />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.modalFooter}>
          <Text style={styles.selectedCount}>
            {localSelectedIds.length} selected
          </Text>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              localSelectedIds.length === 0 && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={localSelectedIds.length === 0}
          >
            <Text style={styles.confirmButtonText}>Confirm Selection</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    color: "#333",
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  userItemSelected: {
    backgroundColor: "#F5F3FF",
    borderColor: "#7d53f6",
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#999",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7d53f6",
  },
  confirmButton: {
    backgroundColor: "#7d53f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: "#ccc",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AssigneeSelector;
