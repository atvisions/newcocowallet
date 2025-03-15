import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TransactionFailedScreen({ route, navigation }) {
  const { error } = route.params;

  const handleTryAgain = () => {
    // 返回到交易确认页面，保留之前的交易信息
    navigation.navigate('SendConfirmation', {
      selectedWallet: route.params.selectedWallet,
      recipientAddress: route.params.recipientAddress,
      amount: route.params.amount,
      token: route.params.token,
      tokenInfo: route.params.tokenInfo
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={80} color="#FF4B55" />
        </View>

        <Text style={styles.title}>Transaction Failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>

        <TouchableOpacity 
          style={styles.tryAgainButton}
          onPress={handleTryAgain}
        >
          <Text style={styles.tryAgainButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 40,
  },
  tryAgainButton: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  tryAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});