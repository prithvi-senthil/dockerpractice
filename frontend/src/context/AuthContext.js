import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log("🔄 Checking auth status...");
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("user");

      console.log(
        "📦 Token from storage:",
        token ? token.substring(0, 20) + "..." : "NOT FOUND",
      );
      console.log(
        "👤 User data from storage:",
        userData ? "FOUND" : "NOT FOUND",
      );

      if (token && userData) {
        try {
          // Try to validate the token first with a test request
          await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          // Token is valid, restore auth
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          console.log("✅ Auth restored with valid token");
        } catch (tokenError) {
          // Token is invalid or expired
          console.log("⚠️  Stored token is invalid/expired, clearing auth");
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          delete api.defaults.headers.common["Authorization"];
        }
      } else {
        console.log("ℹ️  No auth data found in storage");
      }
    } catch (error) {
      console.error("❌ Check auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Normal login with API
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.post("/auth/login", { email, password });
      const { token, user: userData } = response.data;

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Login failed. Please check your credentials.",
      };
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login
  const loginWithGoogle = async (email, serverAuthCode) => {
    try {
      setLoading(true);
      const response = await api.post("/auth/google-login", {
        email: email,
        serverAuthCode: serverAuthCode,
      });

      const { token, user: userData } = response.data;

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Google login error:", error);
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Google login failed. Please ensure you are registered.",
      };
    } finally {
      setLoading(false);
    }
  };

  // TEST MODE: Login without API
  const testLogin = async (email, userType) => {
    try {
      setLoading(true);
      console.log("🧪 Starting test login:", email, "as", userType);

      // Call the backend test login endpoint to get a proper JWT token
      const response = await api.post("/auth/test-login", {
        email: email,
        userType: userType,
      });

      console.log("🧪 Test login response received");
      const { token, user: userData } = response.data;

      console.log(
        "🧪 Token received:",
        token ? token.substring(0, 20) + "..." : "NO TOKEN",
      );
      console.log("🧪 User data received:", userData?.name || "NO USER");

      // Store token and user in AsyncStorage
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      console.log("✅ Stored in AsyncStorage");

      // Set authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      console.log("✅ Set Authorization header");

      // Update state
      setUser(userData);
      setIsAuthenticated(true);

      console.log("✅ Test login successful as:", userType);
      return { success: true };
    } catch (error) {
      console.error(
        "❌ Test login error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error:
          error.response?.data?.error || "Test login failed. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post("/auth/register", userData);
      const { token, user: newUser } = response.data;

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(newUser));

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser(newUser);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");

      delete api.defaults.headers.common["Authorization"];

      setUser(null);
      setIsAuthenticated(false);

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        loginWithGoogle,
        testLogin,
        register,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
