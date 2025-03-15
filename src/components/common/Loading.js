import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Loading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1FC595" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(23, 28, 50, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
}); 