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

// Activity API functions
export const checkScheduleConflict = async (
  courseId,
  dayOfWeek,
  startTime,
  endTime,
) => {
  try {
    const response = await api.post("/activities/check-conflict", {
      courseId,
      dayOfWeek,
      startTime,
      endTime,
    });
    return response.data;
  } catch (error) {
    console.error("Schedule conflict check error:", error);
    throw error;
  }
};

export const getStudents = async () => {
  try {
    const response = await api.get("/activities/students");
    return response.data.students || [];
  } catch (error) {
    console.error("Get students error:", error);
    throw error;
  }
};

export default api;
