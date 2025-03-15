import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DiscoverScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Discover Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
  },
}); 