import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const DepartmentManagementScreen = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [hods, setHods] = useState([]);
  const [loadingHods, setLoadingHods] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hod_id: null,
  });

  useEffect(() => {
    loadDepartments();
    if (user?.user_type === "admin") {
      loadHODs();
    }
  }, []);

  useEffect(() => {
    filterDepartments();
  }, [departments, searchQuery]);

  const filterDepartments = () => {
    if (!searchQuery.trim()) {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(
        (dept) =>
          dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dept.hod_name &&
            dept.hod_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (dept.description &&
            dept.description.toLowerCase().includes(searchQuery.toLowerCase())),
      );
      setFilteredDepartments(filtered);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDepartments();
    setRefreshing(false);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get("/departments");
      const deptList = response.data.departments || response.data.data || [];
      setDepartments(deptList);
    } catch (error) {
      console.error("Error loading departments:", error);
      Alert.alert("Error", "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const loadHODs = async () => {
    try {
      setLoadingHods(true);
      const response = await api.get("/admin/users?role=hod");
      setHods(response.data.data || []);
    } catch (error) {
      console.error("Error loading HODs:", error);
    } finally {
      setLoadingHods(false);
    }
  };

  const handleOpenModal = (dept = null) => {
    if (dept) {
      setFormData({
        name: dept.name,
        description: dept.description || "",
        hod_id: dept.hod_id,
      });
      setEditingId(dept.id);
    } else {
      setFormData({
        name: "",
        description: "",
        hod_id: null,
      });
      setEditingId(null);
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Department name is required");
      return;
    }

    try {
      if (editingId) {
        // Update
        if (user?.user_type !== "admin") {
          Alert.alert("Error", "Only admin can edit departments");
          return;
        }
        await api.put(`/departments/${editingId}`, formData);
        Alert.alert("Success", "Department updated successfully");
      } else {
        // Create
        await api.post("/departments", formData);
        Alert.alert("Success", "Department created successfully");
      }
      setModalVisible(false);
      loadDepartments();
    } catch (error) {
      console.error("Error saving department:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save department",
      );
    }
  };

  const renderDepartmentCard = ({ item }) => (
    <View style={styles.departmentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <View style={styles.deptIconContainer}>
            <Ionicons name="folder" size={20} color="#EF4444" />
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.deptName}>{item.name}</Text>
            {item.hod_name && (
              <Text style={styles.hodNameSmall}>HOD: {item.hod_name}</Text>
            )}
          </View>
        </View>
      </View>

      {item.hod_email && (
        <View style={styles.emailRow}>
          <Ionicons name="mail" size={14} color="#999" />
          <Text style={styles.email}>{item.hod_email}</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editAction}
          onPress={() => handleOpenModal(item)}
          disabled={user?.user_type !== "admin"}
        >
          <Ionicons name="create" size={16} color="#EF4444" />
          <Text style={styles.editActionText}>
            {user?.user_type === "admin" ? "Edit" : "View"}
          </Text>
        </TouchableOpacity>
        {user?.user_type === "admin" && (
          <TouchableOpacity
            style={[styles.editAction, styles.deleteAction]}
            onPress={() => handleDeleteDept(item.id)}
          >
            <Ionicons name="trash" size={16} color="#ff3b30" />
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const handleDeleteDept = (id) => {
    Alert.alert(
      "Delete Department",
      "Are you sure you want to delete this department?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/departments/${id}`);
              Alert.alert("Success", "Department deleted successfully");
              loadDepartments();
            } catch (error) {
              console.error("Error deleting department:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete department",
              );
            }
          },
        },
      ],
    );
  };

  if (loading && departments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Departments</Text>
      </View>

      {/* Add Department Button */}
      {user?.user_type === "admin" && (
        <View style={styles.addButtonSection}>
          <TouchableOpacity
            style={styles.addMainBtn}
            onPress={() => handleOpenModal()}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addMainBtnText}>Add Department</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search departments..."
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

      {/* Departments List */}
      {filteredDepartments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No departments found" : "No departments yet"}
          </Text>
          <Text style={styles.emptySubText}>
            {searchQuery
              ? "Try adjusting your search"
              : user?.user_type === "admin"
                ? "Tap 'Add Department' to create one"
                : "No departments available"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDepartments}
          renderItem={renderDepartmentCard}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EF4444"
            />
          }
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Department" : "Add Department"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Department Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Computer Science"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={user?.user_type === "admin" || !editingId}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Department description"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              multiline
              numberOfLines={4}
              editable={user?.user_type === "admin" || !editingId}
            />

            {user?.user_type === "admin" && (
              <>
                <Text style={styles.label}>Assign HOD</Text>
                <View style={styles.hodSelector}>
                  {loadingHods ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    hods.map((hod) => (
                      <TouchableOpacity
                        key={hod.id}
                        style={[
                          styles.hodOption,
                          formData.hod_id === hod.id &&
                            styles.hodOptionSelected,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, hod_id: hod.id })
                        }
                      >
                        <Text
                          style={[
                            styles.hodOptionText,
                            formData.hod_id === hod.id &&
                              styles.hodOptionTextSelected,
                          ]}
                        >
                          {hod.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                  <TouchableOpacity
                    style={[
                      styles.hodOption,
                      !formData.hod_id && styles.hodOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, hod_id: null })}
                  >
                    <Text
                      style={[
                        styles.hodOptionText,
                        !formData.hod_id && styles.hodOptionTextSelected,
                      ]}
                    >
                      Not assigned
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>
                {editingId ? "Update" : "Create"} Department
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  addButtonSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  addMainBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
  },
  addMainBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    paddingVertical: 8,
  },
  departmentCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#EF4444",
    elevation: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  deptIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  titleSection: {
    flex: 1,
    paddingTop: 2,
  },
  deptName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  hodNameSmall: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
    lineHeight: 18,
    marginLeft: 52,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginLeft: 52,
  },
  email: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginLeft: 52,
  },
  editAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  deleteAction: {
    backgroundColor: "#ffe5e5",
  },
  editActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ff3b30",
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: "#bbb",
    marginTop: 6,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  modalContent: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: "#ffffff",
    color: "#333",
  },
  textArea: {
    textAlignVertical: "top",
    height: 100,
  },
  hodSelector: {
    marginBottom: 20,
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 8,
  },
  hodOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginBottom: 8,
  },
  hodOptionSelected: {
    backgroundColor: "#EF4444",
  },
  hodOptionText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  hodOptionTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
    elevation: 2,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default DepartmentManagementScreen;
