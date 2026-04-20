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
} from "react-native";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const DepartmentManagementScreen = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [hods, setHods] = useState([]);
  const [loadingHods, setLoadingHods] = useState(false);

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

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/departments");
      setDepartments(response.data.departments || response.data.data || []);
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.deptName}>{item.name}</Text>
        </View>
      </View>

      <Text style={styles.description}>
        {item.description || "No description"}
      </Text>

      <View style={styles.hodInfo}>
        <Text style={styles.label}>HOD:</Text>
        <Text style={styles.value}>{item.hod_name || "Not assigned"}</Text>
      </View>

      {item.hod_email && (
        <View style={styles.emailInfo}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.email}>{item.hod_email}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => handleOpenModal(item)}
          disabled={user?.user_type !== "admin"}
        >
          <Text style={styles.editBtnText}>
            {user?.user_type === "admin" ? "Edit" : "View"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Departments</Text>
        {user?.user_type === "admin" && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => handleOpenModal()}
          >
            <Text style={styles.addBtnText}>+ Add Department</Text>
          </TouchableOpacity>
        )}
      </View>

      {departments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No departments found</Text>
          {user?.user_type === "admin" && (
            <Text style={styles.emptySubtext}>
              Tap "Add Department" to create one
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={departments}
          renderItem={renderDepartmentCard}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      )}

      {/* Create/Edit Modal */}
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
              <Text style={styles.closeBtn}>✕</Text>
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
                    <ActivityIndicator size="small" color="#3B82F6" />
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  addBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deptName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    fontStyle: "italic",
  },
  hodInfo: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "center",
  },
  emailInfo: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  email: {
    fontSize: 13,
    color: "#3B82F6",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  editBtn: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editBtnText: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeBtn: {
    fontSize: 28,
    fontWeight: "300",
    color: "#6B7280",
  },
  modalContent: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    textAlignVertical: "top",
    paddingTop: 10,
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
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  hodOptionSelected: {
    backgroundColor: "#3B82F6",
  },
  hodOptionText: {
    fontSize: 13,
    color: "#374151",
  },
  hodOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DepartmentManagementScreen;
