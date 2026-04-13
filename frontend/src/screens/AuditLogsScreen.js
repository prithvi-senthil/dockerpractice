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
  FlatList,
  Modal,
  TextInput,
  Picker,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../services/api";

const AuditLogsScreen = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [entityTypes, setEntityTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
  });

  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  const ACTIONS = ["CREATE", "UPDATE", "DELETE", "VIEW"];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [logsRes, summaryRes, typesRes] = await Promise.all([
        API.get("/audit-logs", {
          params: { limit: 20, offset: 0 },
        }),
        API.get("/audit-logs/summary"),
        API.get("/audit-logs/entity-types"),
      ]);

      setLogs(logsRes.data.logs || []);
      setPagination({
        limit: logsRes.data.limit,
        offset: logsRes.data.offset,
        total: logsRes.data.total,
      });
      setSummary(summaryRes.data);
      setEntityTypes(typesRes.data.entity_types || []);
    } catch (error) {
      console.error("Fetch audit logs error:", error);
      Alert.alert("Error", "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
  };

  const handleFilterApply = async () => {
    try {
      setLoading(true);
      const params = { limit: 20, offset: 0 };
      if (selectedEntityType) params.entity_type = selectedEntityType;
      if (selectedAction) params.action = selectedAction;

      const response = await API.get("/audit-logs", { params });
      setLogs(response.data.logs || []);
      setPagination({
        limit: response.data.limit,
        offset: response.data.offset,
        total: response.data.total,
      });
      setFilterModalVisible(false);
    } catch (error) {
      console.error("Filter error:", error);
      Alert.alert("Error", "Failed to apply filters");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = async () => {
    setSelectedEntityType("");
    setSelectedAction("");
    try {
      setLoading(true);
      const response = await API.get("/audit-logs", {
        params: { limit: 20, offset: 0 },
      });
      setLogs(response.data.logs || []);
      setPagination({
        limit: response.data.limit,
        offset: response.data.offset,
        total: response.data.total,
      });
    } catch (error) {
      console.error("Clear filter error:", error);
      Alert.alert("Error", "Failed to clear filters");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (pagination.offset + pagination.limit >= pagination.total) return;

    try {
      const params = {
        limit: pagination.limit,
        offset: pagination.offset + pagination.limit,
      };
      if (selectedEntityType) params.entity_type = selectedEntityType;
      if (selectedAction) params.action = selectedAction;

      const response = await API.get("/audit-logs", { params });
      setLogs([...logs, ...(response.data.logs || [])]);
      setPagination({
        limit: response.data.limit,
        offset: response.data.offset,
        total: response.data.total,
      });
    } catch (error) {
      console.error("Load more error:", error);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "CREATE":
        return "#10B981";
      case "UPDATE":
        return "#F59E0B";
      case "DELETE":
        return "#EF4444";
      case "VIEW":
        return "#6366F1";
      default:
        return "#999";
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "CREATE":
        return "add-circle-outline";
      case "UPDATE":
        return "create-outline";
      case "DELETE":
        return "trash-outline";
      case "VIEW":
        return "eye-outline";
      default:
        return "information-circle-outline";
    }
  };

  const renderLogItem = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View
          style={[
            styles.actionIcon,
            { backgroundColor: getActionColor(item.action) + "20" },
          ]}
        >
          <Ionicons
            name={getActionIcon(item.action)}
            size={16}
            color={getActionColor(item.action)}
          />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.logAction}>{item.action}</Text>
          <Text style={styles.logEntity}>{item.entity_type}</Text>
        </View>
        <Text style={styles.logTime}>
          {new Date(item.created_at).toLocaleDateString()}
          {"\n"}
          {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.logDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>By:</Text>
          <Text style={styles.detailValue}>{item.actor_name || "System"}</Text>
        </View>
        {item.entity_name && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Entity:</Text>
            <Text style={styles.detailValue}>{item.entity_name}</Text>
          </View>
        )}
        {item.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailValue}>{item.description}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing && logs.length === 0) {
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
        <View>
          <Text style={styles.headerTitle}>Audit Logs</Text>
          <Text style={styles.headerSubtitle}>
            {pagination.total} total records
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter-outline" size={20} color="#7d53f6" />
        </TouchableOpacity>
      </View>

      {/* Summary Section */}
      {summary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryContainer}
        >
          {Object.entries(summary.by_action || {}).map(([action, count]) => (
            <View key={action} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{action}</Text>
              <Text
                style={[styles.summaryCount, { color: getActionColor(action) }]}
              >
                {count}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Logs List */}
      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No audit logs found</Text>
          <Text style={styles.emptySubText}>
            Administrative actions will be logged here
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7d53f6"
            />
          }
          contentContainerStyle={styles.logsList}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            pagination.offset + pagination.limit < pagination.total ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#7d53f6" />
              </View>
            ) : null
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Logs</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterForm}>
              <Text style={styles.label}>Entity Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedEntityType}
                  onValueChange={setSelectedEntityType}
                  style={styles.picker}
                >
                  <Picker.Item label="All Entity Types" value="" />
                  {entityTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Action</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedAction}
                  onValueChange={setSelectedAction}
                  style={styles.picker}
                >
                  <Picker.Item label="All Actions" value="" />
                  {ACTIONS.map((action) => (
                    <Picker.Item key={action} label={action} value={action} />
                  ))}
                </Picker>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.filterBtn, styles.clearBtn]}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterBtn, styles.applyBtn]}
                onPress={handleFilterApply}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
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
  headerSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3e8ff",
  },
  summaryContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  summaryCard: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
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
  logsList: {
    paddingVertical: 10,
  },
  logCard: {
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
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  logEntity: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  logTime: {
    fontSize: 11,
    color: "#999",
    textAlign: "right",
    lineHeight: 16,
  },
  logDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    width: 70,
  },
  detailValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
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
    maxHeight: "70%",
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
  filterForm: {
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
    marginBottom: 20,
    overflow: "hidden",
  },
  picker: {
    height: 40,
    color: "#333",
  },
  filterActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  clearBtnText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 14,
  },
  applyBtn: {
    backgroundColor: "#7d53f6",
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default AuditLogsScreen;
