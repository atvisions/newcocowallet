import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import Header from '../../components/common/Header';
import Loading from '../../components/common/Loading';
import { CommonActions } from '@react-navigation/native';
import { useWallet } from '../../contexts/WalletContext';
import { processWalletData } from '../../utils/walletUtils';

const ImportWallet = ({ navigation, route }) => {
  const { chain } = route.params || {};
  const [privateKey, setPrivateKey] = useState('');
  const { updateSelectedWallet } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!privateKey.trim()) {
      Alert.alert('Error', 'Please enter private key');
      return;
    }

    navigation.navigate('PaymentPassword', {
      title: 'Import Wallet',
      purpose: 'import_wallet',
      onSuccess: async (password) => {
        try {
          // 显示加载页面
          navigation.navigate('LoadingWallet', {
            message: 'Importing wallet...'
          });

          const deviceId = await DeviceManager.getDeviceId();
          const response = await api.importPrivateKey(
            deviceId,
            chain,
            privateKey,
            password
          );

          if (response?.status === 'success') {
            // 处理钱包数据
            if (response.wallet) {
              const processedWallet = processWalletData(response.wallet);
              await updateSelectedWallet(processedWallet);
              
              // 等待状态更新完成
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // 导入成功后重置导航栈并导航到主页面
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'MainStack',
                      params: {
                        screen: 'Tabs',
                        params: {
                          screen: 'Wallet'
                        }
                      }
                    }
                  ]
                })
              );
            }
            return true;
          } else {
            // 导入失败，返回到导入页面
            navigation.goBack();
            Alert.alert('Error', response.message || 'Failed to import wallet');
            return false;
          }
        } catch (error) {
          console.error('Failed to import wallet:', error);
          navigation.goBack();
          Alert.alert('Error', 'Failed to import wallet');
          return false;
        }
      }
    });
  };

  const fetchWalletBalance = async (deviceId) => {
    try {
      const balanceResponse = await api.getWalletBalance(deviceId);
      // 处理余额数据
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      Alert.alert('Error', 'Failed to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <Header 
        title="Import Wallet"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <Text style={styles.label}>Enter Private Key</Text>
        <TextInput
          style={styles.input}
          value={privateKey}
          onChangeText={setPrivateKey}
          placeholder="Enter your private key"
          placeholderTextColor="#8E8E8E"
          secureTextEntry
          multiline
        />

        <TouchableOpacity 
          style={[
            styles.button,
            !privateKey.trim() && styles.buttonDisabled
          ]}
          onPress={handleImport}
          disabled={!privateKey.trim()}
        >
          <Text style={styles.buttonText}>Import</Text>
        </TouchableOpacity>
      </View>

      {loading && <Loading />}
    </SafeAreaView>
  );
};

export default ImportWallet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  option: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});