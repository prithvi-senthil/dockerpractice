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
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const AdminUsersPanel = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("departments"); // "departments", "users", or "assignUsers"
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
  const [departments, setDepartments] = useState([]); // For department dropdown
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");
  const [deptLoading, setDeptLoading] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("hod"); // For creating new users
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    report_to: "",
  });
  const [deptFormData, setDeptFormData] = useState({
    name: "",
    hod_id: null,
  });

  // Assign Users states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedHodForAssign, setSelectedHodForAssign] = useState("");
  const [selectedDeptForAssign, setSelectedDeptForAssign] = useState("");
  const [assignmentError, setAssignmentError] = useState("");

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

      // Fetch all departments from API
      try {
        const deptResponse = await api.get("/departments");
        const deptList =
          deptResponse.data.departments ||
          deptResponse.data.data ||
          deptResponse.data ||
          [];
        setDepartments(Array.isArray(deptList) ? deptList : []);
      } catch (error) {
        console.log("Failed to fetch departments:", error);
        setDepartments([]);
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

  useFocusEffect(
    React.useCallback(() => {
      fetchAllUsers();
    }, []),
  );

  React.useEffect(() => {
    fetchAllUsers();
  }, []);

  React.useEffect(() => {
    if (activeTab === "departments") {
      loadDepartments();
    }
  }, [activeTab]);

  React.useEffect(() => {
    filterDepartments();
  }, [departments, departmentSearchQuery]);

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
        if (selectedRole === "faculty") {
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
        if (editingUser.role === "faculty") {
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
          // Convert department ID to department name for backend
          const deptId = formData.department
            ? parseInt(formData.department)
            : null;
          const selectedDept = Array.isArray(departments)
            ? departments.find((d) => d.id === deptId)
            : null;
          body.department = selectedDept ? selectedDept.name : "";
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

      // Refresh departments if a HOD was created/updated
      if (!editingUser && selectedRole === "hod") {
        loadDepartments();
      } else if (editingUser && editingUser.role === "hod") {
        loadDepartments();
      }
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
            <View style={styles.departmentBadge}>
              <Ionicons name="folder" size={14} color="#EF4444" />
              <Text style={styles.departmentBadgeText}>{item.department}</Text>
            </View>
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

  // ========== DEPARTMENT FUNCTIONS ==========
  const loadDepartments = async () => {
    try {
      setDeptLoading(true);
      const response = await api.get("/departments");
      const deptList = response.data.departments || response.data.data || [];
      setDepartments(deptList);
      setFilteredDepartments(deptList);
    } catch (error) {
      console.error("Error loading departments:", error);
      Alert.alert("Error", "Failed to load departments");
    } finally {
      setDeptLoading(false);
    }
  };

  const filterDepartments = () => {
    if (!departmentSearchQuery.trim()) {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(
        (dept) =>
          dept.name
            .toLowerCase()
            .includes(departmentSearchQuery.toLowerCase()) ||
          (dept.hod_name &&
            dept.hod_name
              .toLowerCase()
              .includes(departmentSearchQuery.toLowerCase())) ||
          (dept.description &&
            dept.description
              .toLowerCase()
              .includes(departmentSearchQuery.toLowerCase())),
      );
      setFilteredDepartments(filtered);
    }
  };

  const handleDeptSubmit = async () => {
    if (!deptFormData.name.trim()) {
      Alert.alert("Error", "Department name is required");
      return;
    }

    try {
      if (editingDeptId) {
        await api.put(`/departments/${editingDeptId}`, deptFormData);
        Alert.alert("Success", "Department updated successfully");
      } else {
        await api.post("/departments", deptFormData);
        Alert.alert("Success", "Department created successfully");
      }
      setShowDeptModal(false);
      loadDepartments();
    } catch (error) {
      console.error("Error saving department:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save department",
      );
    }
  };

  const handleDeleteDept = (id) => {
    Alert.alert(
      "Delete Department",
      "Are you sure you want to delete this department?\n\nThis will remove the department from all assigned users.",
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
              fetchAllUsers(); // Refresh users list to show cleared departments
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

  const handleAssignHodToDept = async () => {
    setAssignmentError("");

    if (!selectedHodForAssign) {
      setAssignmentError("Please select a HOD");
      return;
    }
    if (!selectedDeptForAssign) {
      setAssignmentError("Please select a Department");
      return;
    }

    const selectedHod = Array.isArray(hods)
      ? hods.find((h) => h.id.toString() === selectedHodForAssign)
      : null;
    const selectedDept = Array.isArray(departments)
      ? departments.find((d) => d.id.toString() === selectedDeptForAssign)
      : null;

    if (!selectedHod || !selectedDept) {
      setAssignmentError("Invalid selection");
      return;
    }

    // Check for conflicts - if HOD is already assigned to another department
    if (
      selectedHod.department &&
      selectedHod.department !== selectedDept.name
    ) {
      Alert.alert(
        "Conflict Warning",
        `HOD "${selectedHod.name}" is already assigned to "${selectedHod.department}" department.\n\nAssigning to another department will reassign them.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            style: "destructive",
            onPress: () => performAssignment(selectedHod, selectedDept),
          },
        ],
      );
    } else {
      performAssignment(selectedHod, selectedDept);
    }
  };

  const performAssignment = async (hod, dept) => {
    try {
      await api.put(`/departments/${dept.id}`, {
        name: dept.name,
        hod_id: hod.id,
      });
      Alert.alert(
        "Success",
        `✅ Assigned "${hod.name}" to "${dept.name}" department`,
      );
      setSelectedHodForAssign("");
      setSelectedDeptForAssign("");
      setAssignmentError("");
      loadDepartments();
      fetchAllUsers();
    } catch (error) {
      setAssignmentError("Failed to assign HOD. Please try again.");
      console.error("Assignment error:", error);
    }
  };

  const handleOpenDeptModal = (dept = null) => {
    if (dept) {
      setDeptFormData({
        name: dept.name,
        hod_id: dept.hod_id,
      });
      setEditingDeptId(dept.id);
    } else {
      setDeptFormData({
        name: "",
        hod_id: null,
      });
      setEditingDeptId(null);
    }
    setShowDeptModal(true);
  };

  const renderDepartmentCard = ({ item }) => (
    <View style={styles.userCard}>
      {/* Header with icon and info */}
      <View style={styles.userHeader}>
        <View style={styles.userAvatarContainer}>
          <View style={[styles.userAvatar, { backgroundColor: "#EF4444" }]}>
            <Ionicons name="folder" size={24} color="#fff" />
          </View>
          <View style={styles.userBasicInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            {item.hod_name && (
              <Text style={styles.userEmail}>HOD: {item.hod_name}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Metadata section */}
      <View style={styles.userMetadata}>
        {item.hod_email && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Email:</Text>
            <Text style={styles.reportText}>{item.hod_email}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleOpenDeptModal(item)}
          disabled={user?.user_type !== "admin"}
        >
          <Ionicons name="create" size={16} color="#7d53f6" />
          <Text style={styles.actionBtnText}>
            {user?.user_type === "admin" ? "Edit" : "View"}
          </Text>
        </TouchableOpacity>
        {user?.user_type === "admin" && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeleteDept(item.id)}
          >
            <Ionicons name="trash" size={16} color="#ff3b30" />
            <Text style={[styles.actionBtnText, styles.deleteBtnText]}>
              Delete
            </Text>
          </TouchableOpacity>
        )}
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

  const handleGoBack = () => {
    navigation?.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "departments" && styles.tabActive]}
          onPress={() => setActiveTab("departments")}
        >
          <Ionicons
            name="folder"
            size={18}
            color={activeTab === "departments" ? "#EF4444" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "departments" && styles.tabTextActive,
            ]}
          >
            Departments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "users" && styles.tabActive]}
          onPress={() => setActiveTab("users")}
        >
          <Ionicons
            name="people"
            size={18}
            color={activeTab === "users" ? "#EF4444" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "users" && styles.tabTextActive,
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "assignUsers" && styles.tabActive]}
          onPress={() => setActiveTab("assignUsers")}
        >
          <Ionicons
            name="swap-horizontal"
            size={18}
            color={activeTab === "assignUsers" ? "#EF4444" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "assignUsers" && styles.tabTextActive,
            ]}
          >
            Assign
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === "departments" && (
        /* DEPARTMENTS VIEW */
        <>
          {/* Add Department Button */}
          {user?.user_type === "admin" && (
            <View style={styles.addUserButtonSection}>
              <TouchableOpacity
                style={styles.addUserMainBtn}
                onPress={() => handleOpenDeptModal()}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addUserMainBtnText}>Add Department</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Department Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search departments..."
                value={departmentSearchQuery}
                onChangeText={setDepartmentSearchQuery}
                placeholderTextColor="#999"
              />
              {departmentSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setDepartmentSearchQuery("")}>
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
                {departmentSearchQuery
                  ? "No departments found"
                  : "No departments yet"}
              </Text>
              <Text style={styles.emptySubText}>
                {departmentSearchQuery
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
              contentContainerStyle={styles.usersList}
              scrollEnabled={true}
            />
          )}
        </>
      )}

      {activeTab === "users" && (
        /* USERS VIEW */
        <>
          {/* User Statistics Cards */}
          <View style={styles.statsCardsContainer}>
            {/* HOD Card */}
            <View style={[styles.statCardWrapper, styles.hodCard]}>
              <View style={[styles.statCardGradient, styles.hodGradient]}>
                <View style={styles.cardContent}>
                  <View style={[styles.statIconCircle, styles.hodIconBg]}>
                    <Ionicons name="person" size={22} color="#fff" />
                  </View>
                  <Text style={styles.statCount}>{summary.total_hods}</Text>
                  <Text style={[styles.statLabel, { color: "#EF4444" }]}>
                    HOD
                  </Text>
                </View>
              </View>
            </View>

            {/* Faculty Card */}
            <View style={[styles.statCardWrapper, styles.facultyCard]}>
              <View style={[styles.statCardGradient, styles.facultyGradient]}>
                <View style={styles.cardContent}>
                  <View style={[styles.statIconCircle, styles.facultyIconBg]}>
                    <Ionicons name="briefcase" size={22} color="#fff" />
                  </View>
                  <Text style={styles.statCount}>{summary.total_faculty}</Text>
                  <Text style={[styles.statLabel, { color: "#F59E0B" }]}>
                    Faculty
                  </Text>
                </View>
              </View>
            </View>

            {/* Students Card */}
            <View style={[styles.statCardWrapper, styles.studentCard]}>
              <View style={[styles.statCardGradient, styles.studentGradient]}>
                <View style={styles.cardContent}>
                  <View style={[styles.statIconCircle, styles.studentIconBg]}>
                    <Ionicons name="school" size={22} color="#fff" />
                  </View>
                  <Text style={styles.statCount}>{summary.total_students}</Text>
                  <Text style={[styles.statLabel, { color: "#10B981" }]}>
                    Students
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Add User Button Section */}
          <View style={styles.addUserButtonSection}>
            <TouchableOpacity
              style={styles.addUserMainBtn}
              onPress={handleAddUser}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addUserMainBtnText}>Add User</Text>
            </TouchableOpacity>
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
        </>
      )}

      {activeTab === "assignUsers" && (
        /* ASSIGN USERS VIEW */
        <>
          <ScrollView style={styles.assignContainer}>
            <View style={styles.assignSection}>
              <View style={styles.assignHeader}>
                <View style={styles.assignIconCircle}>
                  <Ionicons name="swap-horizontal" size={24} color="#fff" />
                </View>
                <Text style={styles.assignTitle}>
                  Assign HODs to Departments
                </Text>
              </View>

              {/* HOD Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select HOD *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedHodForAssign}
                    onValueChange={(value) => {
                      setSelectedHodForAssign(value);
                      setAssignmentError("");
                    }}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    <Picker.Item label="Choose a HOD..." value="" />
                    {Array.isArray(hods) && hods.length > 0 ? (
                      hods.map((hod) => (
                        <Picker.Item
                          key={hod.id}
                          label={`${hod.name}${hod.department ? ` (Currently in ${hod.department})` : ""}`}
                          value={hod.id.toString()}
                        />
                      ))
                    ) : (
                      <Picker.Item label="No HODs available" value="" />
                    )}
                  </Picker>
                </View>
              </View>

              {/* Department Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Department *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedDeptForAssign}
                    onValueChange={(value) => {
                      setSelectedDeptForAssign(value);
                      setAssignmentError("");
                    }}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    <Picker.Item label="Choose a Department..." value="" />
                    {Array.isArray(departments) && departments.length > 0 ? (
                      departments.map((dept) => (
                        <Picker.Item
                          key={dept.id}
                          label={`${dept.name}${dept.hod_name ? ` (HOD: ${dept.hod_name})` : " (Unassigned)"}`}
                          value={dept.id.toString()}
                        />
                      ))
                    ) : (
                      <Picker.Item label="No departments available" value="" />
                    )}
                  </Picker>
                </View>
              </View>

              {/* Error Message */}
              {assignmentError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#ff3b30" />
                  <Text style={styles.errorText}>{assignmentError}</Text>
                </View>
              ) : null}

              {/* Assign Button */}
              <TouchableOpacity
                style={styles.assignBtn}
                onPress={handleAssignHodToDept}
              >
                <Ionicons name="swap-horizontal" size={18} color="#fff" />
                <Text style={styles.assignBtnText}>Assign HOD</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
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

            {/* User Info Display Section */}
            {(editingUser && editingUser.name) || formData.name ? (
              <View style={styles.userInfoDisplay}>
                <View style={styles.roleIconContainer}>
                  <View
                    style={[
                      styles.roleBadgeDisplay,
                      {
                        backgroundColor:
                          USER_ROLE_COLORS[editingUser?.role || selectedRole],
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        editingUser?.role === "hod"
                          ? "people"
                          : editingUser?.role === "faculty"
                            ? "person"
                            : "school"
                      }
                      size={20}
                      color="#fff"
                    />
                  </View>
                </View>
                <View style={styles.userInfoText}>
                  <Text style={styles.userInfoName}>
                    {formData.name || editingUser?.name || "New User"}
                  </Text>
                  <Text style={styles.userInfoRole}>
                    {USER_ROLE_LABELS[editingUser?.role || selectedRole]}
                  </Text>
                </View>
              </View>
            ) : null}

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
                />
              </View>

              {/* Department (for HOD and Faculty) */}
              {selectedRole === "faculty" && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Department</Text>
                  <View style={styles.input}>
                    <Text style={styles.departmentReadOnly}>
                      {formData.department || "Auto-filled by HOD"}
                    </Text>
                  </View>
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

      {/* Department Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDeptModal}
        onRequestClose={() => setShowDeptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDeptId ? "Edit Department" : "Add Department"}
              </Text>
              <TouchableOpacity onPress={() => setShowDeptModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Department Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Computer Science"
                  value={deptFormData.name}
                  onChangeText={(text) =>
                    setDeptFormData({ ...deptFormData, name: text })
                  }
                  editable={user?.user_type === "admin" || !editingDeptId}
                />
              </View>

              {user?.user_type === "admin" && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Assign HOD</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={deptFormData.hod_id || ""}
                      onValueChange={(value) =>
                        setDeptFormData({
                          ...deptFormData,
                          hod_id: value ? value : null,
                        })
                      }
                      style={styles.picker}
                      mode="dropdown"
                    >
                      <Picker.Item label="Select HOD..." value="" />
                      {(Array.isArray(hods) ? hods : []).map((hod) => {
                        // Check if this HOD is already assigned to another department
                        const assignedDept = Array.isArray(departments)
                          ? departments.find(
                              (d) =>
                                d.hod_id === hod.id && d.id !== editingDeptId, // Exclude current department if editing
                            )
                          : undefined;
                        const isDisabled = !!assignedDept;
                        const deptLabel = assignedDept
                          ? ` (Assigned to ${assignedDept.name})`
                          : "";

                        return (
                          <Picker.Item
                            key={hod.id}
                            label={`${hod.name}${deptLabel}`}
                            value={hod.id}
                            enabled={!isDisabled}
                          />
                        );
                      })}
                    </Picker>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setShowDeptModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleDeptSubmit}
              >
                <Text style={styles.saveBtnText}>
                  {editingDeptId ? "Update Department" : "Create Department"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.02)",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#EF4444",
  },
  statsCardsContainer: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingTop: 14,
    backgroundColor: "#fafbff",
    gap: 10,
  },
  statCardWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  hodCard: {
    backgroundColor: "#fff",
    borderLeftWidth: 2,
    borderLeftColor: "#EF4444",
  },
  hodGradient: {
    backgroundColor: "#fef2f2",
  },
  facultyCard: {
    backgroundColor: "#fff",
    borderLeftWidth: 2,
    borderLeftColor: "#F59E0B",
  },
  facultyGradient: {
    backgroundColor: "#fffbf0",
  },
  studentCard: {
    backgroundColor: "#fff",
    borderLeftWidth: 2,
    borderLeftColor: "#10B981",
  },
  studentGradient: {
    backgroundColor: "#f0fdf4",
  },
  statCardGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardLabel: {
    flex: 1,
  },
  cardLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 1.2,
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  hodIconBg: {
    backgroundColor: "#EF4444",
  },
  facultyIconBg: {
    backgroundColor: "#F59E0B",
  },
  studentIconBg: {
    backgroundColor: "#10B981",
  },
  statCount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#555",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statSubtext: {
    fontSize: 11,
    color: "#a0a0a0",
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 0.2,
  },
  statInfo: {
    justifyContent: "flex-end",
  },
  statName: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  addUserButtonSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  addUserMainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7d53f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addUserMainBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    width: "100%",
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 13,
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
  departmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#EF4444",
  },
  departmentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
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
    backgroundColor: "#F3E8FF",
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
  userInfoDisplay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#f8f6ff",
    marginBottom: 16,
    gap: 12,
  },
  roleIconContainer: {
    alignItems: "center",
  },
  roleBadgeDisplay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoText: {
    flex: 1,
  },
  userInfoName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  userInfoRole: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fafafa",
    fontWeight: "500",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    overflow: "hidden",
    height: 44,
    justifyContent: "center",
  },
  picker: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  departmentReadOnly: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    fontWeight: "400",
    fontStyle: "italic",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  formBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelBtn: {
    backgroundColor: "#f0f0f0",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  saveBtn: {
    backgroundColor: "#7d53f6",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
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
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#333",
  },
  formTextArea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalFormContent: {
    padding: 16,
  },
  // Assign Users Tab Styles
  assignContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  assignSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  assignHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  assignIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7d53f6",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  assignBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#ff3b30",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#ff3b30",
    fontWeight: "600",
    flex: 1,
  },
});

export default AdminUsersPanel;
