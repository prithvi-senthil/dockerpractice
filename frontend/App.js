import React from "react";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";

// Load fonts immediately when app starts
Font.loadAsync({
  ...Ionicons.font,
}).catch(console.warn);

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#fff" }}
          edges={["bottom", "left", "right"]}
        >
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#fff"
            translucent={false}
          />
          <AppNavigator />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
  