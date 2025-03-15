import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function PasswordDots({ length = 6, filledCount = 0 }) {
  return (
    <View style={styles.container}>
      {Array(length).fill(0).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index < filledCount ? styles.dotFilled : styles.dotEmpty
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  dotEmpty: {
    borderColor: '#8E8E8E',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: '#1FC595',
    backgroundColor: '#1FC595',
  },
}); 