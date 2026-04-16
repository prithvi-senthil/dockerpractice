import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { auditLogAPI } from "../services/api";

const { width } = Dimensions.get("window");

// ── constants ──────────────────────────────────────────────────────────────

const ACTION_META = {
  CREATE: {
    color: "#1B8F4C",
    bg: "#E6F7EE",
    dot: "#1B8F4C",
    border: "#1B8F4C",
  },
  UPDATE: {
    color: "#1558B0",
    bg: "#E8F0FE",
    dot: "#1558B0",
    border: "#1558B0",
  },
  DELETE: {
    color: "#C62828",
    bg: "#FFF0F0",
    dot: "#C62828",
    border: "#C62828",
  },
};

const ENTITY_META = {
  INFRASTRUCTURE: {
    icon: "hardware-chip-outline",
    color: "#00897B",
    bg: "#E0F2F1",
    label: "Infrastructure",
  },
  CATEGORY: {
    icon: "albums-outline",
    color: "#7B1FA2",
    bg: "#F3E5F5",
    label: "Category",
  },
  SUBCATEGORY: {
    icon: "layers-outline",
    color: "#6A1B9A",
    bg: "#EDE7F6",
    label: "Subcategory",
  },
  USER_GROUP: {
    icon: "people-circle-outline",
    color: "#1565C0",
    bg: "#E3F2FD",
    label: "User Group",
  },
  SETTING: {
    icon: "settings-outline",
    color: "#F57F17",
    bg: "#FFF8E1",
    label: "Setting",
  },
  PRIORITY: {
    icon: "star-outline",
    color: "#C62828",
    bg: "#FFEBEE",
    label: "Priority",
  },
};

const DEFAULT_ENTITY = {
  icon: "document-outline",
  color: "#546E7A",
  bg: "#ECEFF1",
  label: "Other",
};

const ENTITY_TYPES = [
  "ALL",
  "INFRASTRUCTURE",
  "CATEGORY",
  "SUBCATEGORY",
  "USER_GROUP",
  "SETTING",
  "PRIORITY",
];
const ACTIONS = ["ALL", "CREATE", "UPDATE", "DELETE"];

const ACTION_LABEL = {
  ALL: "All Actions",
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};
const ENTITY_LABEL = { ALL: "All Types" };

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ── component ──────────────────────────────────────────────────────────────

const AuditLogsScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  const [selectedLog, setSelectedLog] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // ── fetch ────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(
    async (opts = {}) => {
      const { pageNum = 1, isRefresh = false, append = false } = opts;

      if (pageNum === 1 && !append)
        isRefresh ? setRefreshing(true) : setLoading(true);
      else setLoadingMore(true);

      try {
        const params = {
          page: pageNum,
          limit: 30,
          ...(entityFilter !== "ALL" ? { entity_type: entityFilter } : {}),
          ...(actionFilter !== "ALL" ? { action: actionFilter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        };

        const res = await auditLogAPI.getLogs(params);
        const { logs: newLogs, pagination } = res.data;

        setLogs((prev) => (append ? [...prev, ...newLogs] : newLogs));
        setPage(pagination.page);
        setTotalPages(pagination.total_pages);
        setTotal(pagination.total);
      } catch (err) {
        console.error("AuditLogs fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [entityFilter, actionFilter, search],
  );

  useEffect(() => {
    fetchLogs({ pageNum: 1 });
  }, [fetchLogs]);

  const handleRefresh = () => fetchLogs({ pageNum: 1, isRefresh: true });

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchLogs({ pageNum: page + 1, append: true });
    }
  };

  const openDetail = (log) => {
    setSelectedLog(log);
    setDetailVisible(true);
  };

  // ── render helpers ───────────────────────────────────────────────────────

  const renderItem = ({ item, index }) => {
    const am = ACTION_META[item.action] || {
      color: "#546E7A",
      bg: "#ECEFF1",
      border: "#546E7A",
    };
    const em = ENTITY_META[item.entity_type] || DEFAULT_ENTITY;

    return (
      <TouchableOpacity
        style={[styles.logCard, { borderLeftColor: am.border }]}
        onPress={() => openDetail(item)}
        activeOpacity={0.7}
      >
        {/* entity icon bubble */}
        <View style={[styles.entityBubble, { backgroundColor: em.bg }]}>
          <Ionicons name={em.icon} size={18} color={em.color} />
        </View>

        <View style={styles.logBody}>
          {/* top row: action pill + entity label + name */}
          <View style={styles.logTopRow}>
            <View style={[styles.actionPill, { backgroundColor: am.bg }]}>
              <View style={[styles.actionDot, { backgroundColor: am.dot }]} />
              <Text style={[styles.actionPillText, { color: am.color }]}>
                {ACTION_LABEL[item.action] || item.action}
              </Text>
            </View>
            <Text style={[styles.entityLabel, { color: em.color }]}>
              {em.label}
            </Text>
          </View>

          {/* entity name / description */}
          {item.entity_name ? (
            <Text style={styles.entityName} numberOfLines={1}>
              {item.entity_name}
            </Text>
          ) : null}
          <Text style={styles.description} numberOfLines={2}>
            {item.description || `${item.action} on ${item.entity_type}`}
          </Text>

          {/* meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="person-circle" size={13} color="#aaa" />
              <Text style={styles.metaText}>{item.actor_name || "System"}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color="#aaa" />
              <Text style={styles.metaText}>
                {formatDateShort(item.created_at)}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={15} color="#D0D0D0" />
      </TouchableOpacity>
    );
  };

  const renderDetail = () => {
    if (!selectedLog) return null;
    const log = selectedLog;
    const am = ACTION_META[log.action] || {
      color: "#546E7A",
      bg: "#ECEFF1",
      border: "#546E7A",
    };
    const em = ENTITY_META[log.entity_type] || DEFAULT_ENTITY;

    const renderJSON = (val) => {
      if (!val) return <Text style={styles.jsonNull}>—</Text>;
      try {
        const obj = typeof val === "string" ? JSON.parse(val) : val;
        return (
          <View style={styles.jsonBlock}>
            {Object.entries(obj).map(([k, v]) => (
              <View key={k} style={styles.jsonRow}>
                <Text style={styles.jsonKey}>{k}</Text>
                <Text style={styles.jsonVal}>{String(v ?? "—")}</Text>
              </View>
            ))}
          </View>
        );
      } catch {
        return <Text style={styles.jsonVal}>{String(val)}</Text>;
      }
    };

    return (
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* drag handle */}
            <View style={styles.dragHandle} />

            {/* coloured header strip */}
            <View
              style={[
                styles.modalHeaderStrip,
                { backgroundColor: am.bg, borderBottomColor: am.border + "33" },
              ]}
            >
              <View style={[styles.entityBubbleLg, { backgroundColor: em.bg }]}>
                <Ionicons name={em.icon} size={22} color={em.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <View
                    style={[
                      styles.actionPill,
                      { backgroundColor: am.color + "22" },
                    ]}
                  >
                    <View
                      style={[styles.actionDot, { backgroundColor: am.color }]}
                    />
                    <Text style={[styles.actionPillText, { color: am.color }]}>
                      {ACTION_LABEL[log.action] || log.action}
                    </Text>
                  </View>
                  <Text style={[styles.entityLabel, { color: em.color }]}>
                    {em.label}
                  </Text>
                </View>
                <Text style={styles.modalEntityName} numberOfLines={1}>
                  {log.entity_name || `ID ${log.entity_id || "—"}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={styles.closeBtn}
              >
                <View style={styles.closeBtnCircle}>
                  <Ionicons name="close" size={16} color="#555" />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* info cards */}
              <View style={styles.infoGrid}>
                <InfoCard
                  icon="person-outline"
                  label="Changed by"
                  value={log.actor_name || "System"}
                  sub={log.actor_email}
                />
                <InfoCard
                  icon="time-outline"
                  label="When"
                  value={formatDate(log.created_at)}
                />
              </View>

              {log.description ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Summary</Text>
                  <Text style={styles.summaryText}>{log.description}</Text>
                </View>
              ) : null}

              {/* before / after */}
              {(log.old_value || log.new_value) && (
                <View style={styles.diffSection}>
                  {log.old_value && (
                    <View style={[styles.diffBlock, styles.diffBefore]}>
                      <View style={styles.diffHeader}>
                        <Ionicons
                          name="remove-circle"
                          size={14}
                          color="#C62828"
                        />
                        <Text style={[styles.diffTitle, { color: "#C62828" }]}>
                          Before
                        </Text>
                      </View>
                      {renderJSON(log.old_value)}
                    </View>
                  )}
                  {log.new_value && (
                    <View style={[styles.diffBlock, styles.diffAfter]}>
                      <View style={styles.diffHeader}>
                        <Ionicons name="add-circle" size={14} color="#1B8F4C" />
                        <Text style={[styles.diffTitle, { color: "#1B8F4C" }]}>
                          After
                        </Text>
                      </View>
                      {renderJSON(log.new_value)}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      {/* search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#aaa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, description…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => fetchLogs({ pageNum: 1 })}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>ENTITY TYPE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {ENTITY_TYPES.map((opt) => {
            const active = entityFilter === opt;
            const em2 = ENTITY_META[opt];
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: em2?.color || "#7d53f6",
                    borderColor: em2?.color || "#7d53f6",
                  },
                ]}
                onPress={() => setEntityFilter(opt)}
              >
                {em2 && (
                  <Ionicons
                    name={em2.icon}
                    size={12}
                    color={active ? "#fff" : em2.color}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {ENTITY_LABEL[opt] || opt.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>ACTION</Text>
        <View style={styles.actionChipRow}>
          {ACTIONS.map((opt) => {
            const active = actionFilter === opt;
            const am2 = ACTION_META[opt];
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.actionChip,
                  active && {
                    backgroundColor: am2?.color || "#7d53f6",
                    borderColor: am2?.color || "#7d53f6",
                  },
                ]}
                onPress={() => setActionFilter(opt)}
              >
                {am2 && (
                  <View
                    style={[
                      styles.actionDot,
                      {
                        backgroundColor: active ? "#fff" : am2.dot,
                        marginRight: 5,
                      },
                    ]}
                  />
                )}
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {ACTION_LABEL[opt] || opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!loading && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {total} log{total !== 1 ? "s" : ""}
          </Text>
        </View>
      )}
    </View>
  );

  // ── main render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          {renderListHeader()}
          <ActivityIndicator
            size="large"
            color="#7d53f6"
            style={{ marginTop: 40 }}
          />
          <Text style={styles.loadingText}>Loading audit logs…</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#7d53f6"]}
              tintColor="#7d53f6"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ padding: 20 }} color="#7d53f6" />
            ) : (
              <View style={{ height: 30 }} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="document-text" size={40} color="#C5C5C5" />
              </View>
              <Text style={styles.emptyTitle}>No logs found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your filters or search
              </Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderDetail()}
    </View>
  );
};

// ── helper sub-components ──────────────────────────────────────────────────

const InfoCard = ({ icon, label, value, sub }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoCardIcon}>
      <Ionicons name={icon} size={15} color="#7d53f6" />
    </View>
    <Text style={styles.infoCardLabel}>{label}</Text>
    <Text style={styles.infoCardValue} numberOfLines={1}>
      {value}
    </Text>
    {sub ? (
      <Text style={styles.infoCardSub} numberOfLines={1}>
        {sub}
      </Text>
    ) : null}
  </View>
);

// ── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F3F7" },
  centered: { flex: 1, backgroundColor: "#F2F3F7" },
  loadingText: {
    marginTop: 10,
    color: "#aaa",
    fontSize: 14,
    fontWeight: "500",
  },

  // ── list header ──
  listHeader: { paddingBottom: 6 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform?.OS === "ios" ? 11 : 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
  },

  filterSection: { marginBottom: 10 },
  filterLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#aaa",
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 7,
  },
  chipScroll: { paddingLeft: 14, flexGrow: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
  },
  chipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  actionChipRow: { flexDirection: "row", paddingLeft: 14, gap: 8 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
  },

  countRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 2,
  },
  countText: { fontSize: 12, color: "#aaa", fontWeight: "600" },

  // ── log card ──
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  entityBubble: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logBody: { flex: 1 },
  logTopRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 5,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  actionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  actionPillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  entityLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  entityName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  description: {
    fontSize: 12.5,
    color: "#666",
    lineHeight: 17,
    marginBottom: 7,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CCC",
    marginHorizontal: 6,
  },
  metaText: { fontSize: 11, color: "#aaa", fontWeight: "500" },

  // ── empty ──
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#555",
    marginBottom: 5,
  },
  emptySubtitle: { fontSize: 13, color: "#aaa" },

  // ── detail modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#F2F3F7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    overflow: "hidden",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  modalHeaderStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  entityBubbleLg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalEntityName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  closeBtn: { padding: 4 },
  closeBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: { padding: 16, paddingBottom: 36 },

  // info cards grid
  infoGrid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  infoCardIcon: { marginBottom: 6 },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoCardValue: { fontSize: 13, fontWeight: "700", color: "#222" },
  infoCardSub: { fontSize: 11, color: "#aaa", marginTop: 2 },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryText: { fontSize: 13.5, color: "#333", lineHeight: 20 },

  // diff section
  diffSection: { gap: 10 },
  diffBlock: {
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  diffBefore: { backgroundColor: "#FFF5F5" },
  diffAfter: { backgroundColor: "#F0FFF5" },
  diffHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  diffTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  jsonBlock: { gap: 6 },
  jsonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 4,
  },
  jsonKey: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    backgroundColor: "#0000000a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  jsonVal: { fontSize: 12, color: "#333", flex: 1, paddingVertical: 2 },
  jsonNull: { fontSize: 12, color: "#BBB", fontStyle: "italic" },
});

export default AuditLogsScreen;
