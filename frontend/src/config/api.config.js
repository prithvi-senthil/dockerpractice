import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  // Priority order:
  // 1. Environment variable
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  // 2. Expo config
  if (Constants.expoConfig?.extra?.API_BASE_URL) {
    return Constants.expoConfig.extra.API_BASE_URL;
  }
  
  // 3. Fallback to local development
  return 'http://192.168.137.59:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();
console.log('📡 API Base URL:', API_BASE_URL);