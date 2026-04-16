import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api.config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add token to headers
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("📤 API Request:", config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error(
      "❌ Response Error:",
      error.response?.status,
      error.response?.data,
    );
    return Promise.reject(error);
  },
);

// ═══════════════════════════════════════════════════════════
// ACTIVITY API (Courses & Sessions)
// ═══════════════════════════════════════════════════════════

export const createCourse = async (courseData) => {
  try {
    const response = await api.post("/activities/courses", courseData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getCourses = async () => {
  try {
    const response = await api.get("/activities/courses");
    return response.data.courses || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getCourseById = async (courseId) => {
  try {
    const response = await api.get(`/activities/courses/${courseId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getSessions = async (date = null) => {
  try {
    const response = await api.get("/activities/sessions", {
      params: { date },
    });
    return response.data.sessions || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getSessionById = async (sessionId) => {
  try {
    const response = await api.get(`/activities/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getSessionStudents = async (sessionId) => {
  try {
    const response = await api.get(
      `/activities/sessions/${sessionId}/students`,
    );
    return response.data.students || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const generateStartOTP = async (sessionId) => {
  try {
    const response = await api.post(
      `/activities/sessions/${sessionId}/generate-start-otp`,
      {},
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const generateEndOTP = async (sessionId) => {
  try {
    const response = await api.post(
      `/activities/sessions/${sessionId}/generate-end-otp`,
      {},
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const checkScheduleConflict = async (conflictData) => {
  try {
    const response = await api.post("/activities/check-conflict", conflictData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const addStudentsToCourse = async (courseId, studentIds) => {
  try {
    const response = await api.post(
      `/activities/courses/${courseId}/students`,
      { student_ids: studentIds },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getCourseStudents = async (courseId) => {
  try {
    const response = await api.get(`/activities/courses/${courseId}/students`);
    return response.data.students || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getCourseSessions = async (courseId) => {
  try {
    const response = await api.get(`/activities/courses/${courseId}/sessions`);
    return response.data.sessions || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getFaculty = async () => {
  try {
    const response = await api.get("/activities/faculty");
    return response.data.faculty || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getStudents = async () => {
  try {
    const response = await api.get("/activities/students");
    return response.data.students || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ═══════════════════════════════════════════════════════════
// ATTENDANCE API
// ═══════════════════════════════════════════════════════════

export const markAttendanceStart = async (sessionId, otp) => {
  try {
    const response = await api.post("/attendance/mark-start", {
      sessionId,
      otp,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const markAttendanceEnd = async (sessionId, otp) => {
  try {
    const response = await api.post("/attendance/mark-end", {
      sessionId,
      otp,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMyAttendance = async (courseId = null) => {
  try {
    const response = await api.get("/attendance/my-attendance", {
      params: { course_id: courseId },
    });
    return response.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAttendanceSummary = async () => {
  try {
    const response = await api.get("/attendance/summary");
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getSessionReport = async (sessionId) => {
  try {
    const response = await api.get(`/attendance/session/${sessionId}/report`);
    return response.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ═══════════════════════════════════════════════════════════
// LEAVE REQUEST API
// ═══════════════════════════════════════════════════════════

export const createLeaveRequest = async (leaveData) => {
  try {
    const response = await api.post("/leaves", leaveData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getLeaveRequests = async () => {
  try {
    const response = await api.get("/leaves");
    return response.data || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateLeaveStatus = async (
  leaveId,
  status,
  rejectionReason = null,
) => {
  try {
    const response = await api.patch(`/leaves/${leaveId}`, {
      status,
      rejection_reason: rejectionReason,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getLeaveSummary = async (studentId = null) => {
  try {
    const endpoint = studentId
      ? `/leaves/summary/${studentId}`
      : "/leaves/my-summary";
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ═══════════════════════════════════════════════════════════
// INFRASTRUCTURE API (Admin Only)
// ═══════════════════════════════════════════════════════════

export const getInfrastructureList = async () => {
  try {
    const response = await api.get("/infrastructure/list");
    return response.data.infrastructure || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getInfrastructureById = async (id) => {
  try {
    const response = await api.get(`/infrastructure/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const createInfrastructure = async (infrastructureData) => {
  try {
    const response = await api.post(
      "/infrastructure/create",
      infrastructureData,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateInfrastructure = async (id, infrastructureData) => {
  try {
    const response = await api.put(`/infrastructure/${id}`, infrastructureData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteInfrastructure = async (id) => {
  try {
    const response = await api.delete(`/infrastructure/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const checkTimeConflict = async (infraId, startTime, endTime) => {
  try {
    const response = await api.post(
      `/infrastructure/${infraId}/check-conflict`,
      { start_time: startTime, end_time: endTime },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ═══════════════════════════════════════════════════════════
// SETTINGS API (Admin Only - DEPRECATED, use uppercase versions below)

// ═══════════════════════════════════════════════════════════
// AUDIT LOGS API (Admin Only)
// ═══════════════════════════════════════════════════════════

export const getAuditLogs = async (params = {}) => {
  try {
    const response = await api.get("/audit-logs", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAuditLogById = async (id) => {
  try {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAuditLogEntityTypes = async () => {
  try {
    const response = await api.get("/audit-logs/entity-types");
    return response.data.entity_types || [];
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAuditLogSummary = async () => {
  try {
    const response = await api.get("/audit-logs/summary");
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ═══════════════════════════════════════════════════════════
// SETTINGS API (Admin Only)
// ═══════════════════════════════════════════════════════════

export const getOTPValidity = async () => {
  try {
    const response = await api.get("/settings/otp-validity");
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateOTPValidity = async (validity_seconds) => {
  try {
    const response = await api.put("/settings/otp-validity", {
      validity_seconds,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getWorkingHours = async () => {
  try {
    const response = await api.get("/settings/working-hours");
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateWorkingHours = async (enabled, start_time, end_time) => {
  try {
    const response = await api.put("/settings/working-hours", {
      enabled,
      start_time,
      end_time,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ═══════════════════════════════════════════════════════════
// AUDIT LOGS API (Admin Only)
// ═══════════════════════════════════════════════════════════

export const auditLogAPI = {
  getLogs: async (params) => {
    try {
      const response = await api.get("/audit-logs", { params });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getEntityTypes: async () => {
    try {
      const response = await api.get("/audit-logs/entity-types");
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ═══════════════════════════════════════════════════════════
// USER API (Faculty & Students)
// ═══════════════════════════════════════════════════════════

export const userAPI = {
  getAssignableUsers: async (params = {}) => {
    try {
      const response = await api.get("/activities/faculty", { params });
      return response.data.faculty || [];
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getFaculty: async () => {
    try {
      const response = await api.get("/activities/faculty");
      return response.data.faculty || [];
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getStudents: async () => {
    try {
      const response = await api.get("/activities/students");
      return response.data.students || [];
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ═══════════════════════════════════════════════════════════
// COURSE API (Courses & Management)
// ═══════════════════════════════════════════════════════════

export const courseAPI = {
  createCourse: async (courseData) => {
    try {
      const response = await api.post("/activities/courses", courseData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getCourses: async () => {
    try {
      const response = await api.get("/activities/courses");
      return response.data.courses || [];
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getCourseById: async (courseId) => {
    try {
      const response = await api.get(`/activities/courses/${courseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  addStudents: async (courseId, studentIds) => {
    try {
      const response = await api.post(
        `/activities/courses/${courseId}/students`,
        { student_ids: studentIds },
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getStudents: async (courseId) => {
    try {
      const response = await api.get(
        `/activities/courses/${courseId}/students`,
      );
      return response.data.students || [];
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getSessions: async (courseId) => {
    try {
      const response = await api.get(
        `/activities/courses/${courseId}/sessions`,
      );
      return response.data.sessions || [];
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  acceptCourse: async (courseId) => {
    try {
      const response = await api.post(`/activities/courses/${courseId}/accept`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  rejectCourse: async (courseId, rejectData) => {
    try {
      const response = await api.post(
        `/activities/courses/${courseId}/reject`,
        rejectData,
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default api;
