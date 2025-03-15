import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function BalanceSkeleton() {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startShimmer = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerValue, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startShimmer();
  }, []);

  const Skeleton = ({ style }) => {
    const opacity = shimmerValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.2, 0.4, 0.2],
    });

    return (
      <Animated.View
        style={[
          styles.baseSkeleton,
          style,
          {
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <View style={styles.headerLeft}>
          <Skeleton style={styles.labelSkeleton} />
          <Skeleton style={styles.amountSkeleton} />
        </View>
        <Skeleton style={styles.changeSkeleton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    paddingVertical: 26,
    marginBottom: 16,
    backgroundColor: '#1B2341',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  baseSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
  },
  labelSkeleton: {
    width: 120,
    height: 15,
    marginBottom: 18,
  },
  amountSkeleton: {
    width: 180,
    height: 42,
  },
  changeSkeleton: {
    width: 90,
    height: 32,
    borderRadius: 20,
    marginLeft: 16,
  },
});