import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

const ModernLoadingSpinner = ({ size = 30, color = "#2563EB" }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    spin.start();

    return () => spin.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ rotate: spin }],
        },
      ]}
    >
      <View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: size / 5,
            borderColor: `${color}20`,
            borderTopColor: color,
            borderRightColor: color,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    borderStyle: "solid",
  },
});

export default ModernLoadingSpinner;
