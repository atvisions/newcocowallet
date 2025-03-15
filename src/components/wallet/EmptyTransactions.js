import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmptyTransactions() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="time" size={40} color="#8E8E8E" />
      </View>
      <Text style={styles.title}>No Transactions Yet</Text>
      <Text style={styles.description}>
        Your transaction history will appear here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(142, 142, 142, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
  },
});