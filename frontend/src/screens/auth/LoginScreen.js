import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, testLogin } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Login Failed", result.error);
    }
  };

  const handleTestLogin = async (userType) => {
    setLoading(true);
    const testEmail = userType === 'faculty' ? 'test-faculty@college.edu' : 'test-student@college.edu';
    const result = await testLogin(testEmail, userType);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Test Login Failed", result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Attendance Tracker</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Register</Text>
          </Text>
        </TouchableOpacity>

        {/* Test Credentials */}
        <View style={styles.credentialsBox}>
          <Text style={styles.credentialsTitle}>📋 Test Credentials</Text>
          <Text style={styles.credentialsText}>
            Email: admin@college.edu{"\n"}
            Password: password123
          </Text>
        </View>

        {/* Test Login Buttons */}
        <View style={styles.testLoginContainer}>
          <TouchableOpacity
            style={[styles.testButton, styles.testButtonStudent]}
            onPress={() => handleTestLogin('student')}
            disabled={loading}
          >
            <Text style={styles.testButtonText}>🧑‍🎓 Test as Student</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.testButtonFaculty]}
            onPress={() => handleTestLogin('faculty')}
            disabled={loading}
          >
            <Text style={styles.testButtonText}>👨‍🏫 Test as Faculty</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    marginTop: 20,
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  linkBold: {
    color: "#007AFF",
    fontWeight: "600",
  },
  credentialsBox: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  credentialsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1976D2",
    marginBottom: 8,
  },
  credentialsText: {
    fontSize: 12,
    color: "#1565C0",
    lineHeight: 18,
  },
  testLoginContainer: {
    marginTop: 20,
    gap: 10,
  },
  testButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
  },
  testButtonStudent: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  testButtonFaculty: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
});

export default LoginScreen;
