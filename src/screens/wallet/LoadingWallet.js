import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processWalletData } from '../../utils/walletUtils';
import { useWallet } from '../../contexts/WalletContext';

export default function LoadingWallet({ route, navigation }) {
  const { updateSelectedWallet } = useWallet();
  const [loadingText, setLoadingText] = useState('Preparing to import wallet...');
  const [isImporting, setIsImporting] = useState(true);

  useEffect(() => {
    const importTimeout = setTimeout(() => {
      startImportProcess();
    }, 500);

    return () => clearTimeout(importTimeout);
  }, []);

  const startImportProcess = async () => {
    try {
      const { purpose, chain, privateKey, password, importedWallet } = route.params;
      const deviceId = await DeviceManager.getDeviceId();

      if (purpose === 'import_wallet' && !importedWallet) {
        setLoadingText('Importing wallet...');
        const importResponse = await api.importPrivateKey(deviceId, chain, privateKey, password);

        if (!importResponse?.status === 'success') {
          throw new Error(importResponse?.message || 'Import failed');
        }

        const wallet = importResponse.wallet;
        await processWalletImport(deviceId, wallet);
      } else if (importedWallet) {
        await processWalletImport(deviceId, importedWallet);
      }
    } catch (error) {
      console.error('Import process error:', error);
      Alert.alert('Error', error.message || 'Failed to import wallet', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setIsImporting(false);
    }
  };

  const processWalletImport = async (deviceId, wallet) => {
    try {
      setLoadingText('Processing wallet data...');
      const processedWallet = processWalletData(wallet);
      await updateSelectedWallet(processedWallet);

      setLoadingText('Loading additional data...');
      fetchWalletTokens(deviceId, processedWallet).catch(error => {
        console.warn('Token fetch error:', error);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'MainStack',
            state: {
              routes: [{
                name: 'Tabs',
                params: {
                  screen: 'Wallet',
                  params: { refresh: true }
                }
              }]
            }
          }]
        })
      );
    } catch (error) {
      throw error;
    }
  };

  const fetchWalletTokens = async (deviceId, wallet) => {
    try {
      const tokensResponse = await api.getWalletTokens(deviceId, wallet.id, wallet.chain);
      if (tokensResponse?.data) {
        await AsyncStorage.setItem(
          `tokens_${wallet.id}`,
          JSON.stringify({
            data: tokensResponse.data,
            timestamp: Date.now()
          })
        );
      }
    } catch (error) {
      console.warn('Token fetch error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1FC595" />
      <Text style={styles.loadingText}>{loadingText}</Text>
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
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center'
  }
});
