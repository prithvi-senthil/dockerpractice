import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../services/api";

const InfrastructureManagementScreen = () => {
  const [infrastructureList, setInfrastructureList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    subtype: "",
    capacity: "",
    location: "",
  });

  useEffect(() => {
    fetchInfrastructure();
  }, []);

  const fetchInfrastructure = async () => {
    try {
      setLoading(true);
      const response = await API.get("/infrastructure/list");
      setInfrastructureList(response.data.infrastructure || []);
    } catch (error) {
      console.error("Fetch infrastructure error:", error);
      Alert.alert("Error", "Failed to fetch infrastructure");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInfrastructure();
    setRefreshing(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Please enter infrastructure name");
      return false;
    }
    if (!formData.subtype.trim()) {
      Alert.alert(
        "Validation Error",
        "Please enter subtype (e.g., Lab, Room, Hall)",
      );
      return false;
    }
    if (!formData.capacity || isNaN(parseInt(formData.capacity))) {
      Alert.alert("Validation Error", "Please enter valid capacity (number)");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        name: formData.name.trim(),
        subtype: formData.subtype.trim(),
        capacity: parseInt(formData.capacity),
        location: formData.location.trim(),
      };

      if (editingId) {
        await API.put(`/infrastructure/${editingId}`, payload);
        Alert.alert("Success", "Infrastructure updated successfully");
      } else {
        await API.post("/infrastructure/create", payload);
        Alert.alert("Success", "Infrastructure created successfully");
      }

      resetForm();
      setModalVisible(false);
      await fetchInfrastructure();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to save infrastructure",
      );
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      subtype: item.subtype,
      capacity: item.capacity.toString(),
      location: item.location || "",
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Infrastructure",
      "Are you sure you want to delete this?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/infrastructure/${id}`);
              Alert.alert("Success", "Infrastructure deleted successfully");
              await fetchInfrastructure();
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete infrastructure");
            }
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setFormData({ name: "", subtype: "", capacity: "", location: "" });
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const renderInfrastructureItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Ionicons name="briefcase" size={20} color="#7d53f6" />
          <View style={styles.titleText}>
            <Text style={styles.infraName}>{item.name}</Text>
            <Text style={styles.infraSubtype}>{item.subtype}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          {item.is_active ? (
            <>
              <View style={[styles.badge, { backgroundColor: "#10B981" }]} />
              <Text style={styles.statusText}>Active</Text>
            </>
          ) : (
            <>
              <View style={[styles.badge, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.statusText}>Inactive</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Capacity:</Text>
          <Text style={styles.detailValue}>{item.capacity} persons</Text>
        </View>
        {item.location && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{item.location}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="create" size={16} color="#7d53f6" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Infrastructure Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7d53f6" />
        </View>
      ) : infrastructureList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No infrastructure</Text>
          <Text style={styles.emptySubText}>
            Tap the add button to create infrastructure
          </Text>
        </View>
      ) : (
        <FlatList
          data={infrastructureList}
          renderItem={renderInfrastructureItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7d53f6"
            />
          }
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      )}

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit Infrastructure" : "Add Infrastructure"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Computer Lab A"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />

              <Text style={styles.label}>Subtype *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Lab, Room, Hall"
                value={formData.subtype}
                onChangeText={(text) =>
                  setFormData({ ...formData, subtype: text })
                }
              />

              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={formData.capacity}
                keyboardType="number-pad"
                onChangeText={(text) =>
                  setFormData({ ...formData, capacity: text })
                }
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Block A, Floor 3"
                value={formData.location}
                onChangeText={(text) =>
                  setFormData({ ...formData, location: text })
                }
              />
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>Save</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7d53f6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
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
  listContent: {
    paddingVertical: 10,
  },
  card: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  titleText: {
    marginLeft: 10,
    flex: 1,
  },
  infraName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  infraSubtype: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    width: 80,
  },
  detailValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  editBtn: {
    borderColor: "#7d53f6",
    backgroundColor: "#f3e8ff",
  },
  editBtnText: {
    color: "#7d53f6",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 5,
  },
  deleteBtn: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  deleteBtnText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 5,
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
  formContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 15,
    color: "#333",
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

export default InfrastructureManagementScreen;
