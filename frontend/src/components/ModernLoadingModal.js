import React from "react";
import { View, Modal, StyleSheet, Animated, Easing } from "react-native";

const ModernLoadingModal = ({ visible }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Subtle Backdrop */}
        <View style={styles.backdrop} />

        {/* Minimal Spinner - Instagram/Claude/Google Style */}
        <AnimatedSpinner />
      </View>
    </Modal>
  );
};

const AnimatedSpinner = () => {
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
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
        styles.spinner,
        {
          transform: [{ rotate: spin }],
        },
      ]}
    >
      <View style={styles.spinnerCircle} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  spinner: {
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#F0F0F0",
    borderTopColor: "#2563EB",
    borderRightColor: "#2563EB",
  },
});

export default ModernLoadingModal;
