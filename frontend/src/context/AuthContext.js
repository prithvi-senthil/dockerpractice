import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

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
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        // Set default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Check auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Normal login with API
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed. Please check your credentials.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // TEST MODE: Login without API
  const testLogin = async (email, userType) => {
    try {
      setLoading(true);
      
      // Create fake user data based on email domain
      const isFaculty = userType === 'faculty' || email.includes('faculty') || email.includes('teacher');
      const finalUserType = isFaculty ? 'faculty' : 'student';
      
      const fakeUser = {
        id: finalUserType === 'faculty' ? `F${Date.now()}` : `S${Date.now()}`,
        email: email,
        user_type: finalUserType,
        name: email.split('@')[0],
        isTestUser: true,
      };
      
      const fakeToken = `test-token-${Date.now()}`;
      
      // Store in AsyncStorage
      await AsyncStorage.setItem('token', fakeToken);
      await AsyncStorage.setItem('user', JSON.stringify(fakeUser));
      
      // Update state
      setUser(fakeUser);
      setIsAuthenticated(true);
      
      console.log('✅ Test login successful as:', finalUserType);
      return { success: true };
    } catch (error) {
      console.error('Test login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/register', userData);
      const { token, user: newUser } = response.data;
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      delete api.defaults.headers.common['Authorization'];
      
      setUser(null);
      setIsAuthenticated(false);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      testLogin,
      register,
      logout,
      checkAuthStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};