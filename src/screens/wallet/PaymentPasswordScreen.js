import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/common/Header';
import PasswordDots from '../../components/common/PasswordDots';
import { DeviceManager } from '../../utils/device';
import { api } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { useWallet } from '../../contexts/WalletContext';
import { processWalletData } from '../../utils/walletUtils';
import Toast, { ToastView } from '../../components/Toast';

export default function PaymentPasswordScreen({ route, navigation }) {
  const { title = 'Enter Password', action, walletId, onSuccess } = route.params || {};
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { updateSelectedWallet, checkAndUpdateWallets } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');

  useEffect(() => {
    console.log('Password length:', password.length);
    if (password.length === 6) {
      console.log('Password complete, submitting...');
      handlePasswordComplete(password);
    }
  }, [password]);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => setError(''));
    }
  }, [error]);

  useEffect(() => {
    const getDeviceId = async () => {
      const id = await DeviceManager.getDeviceId();
      setDeviceId(id);
    };
    getDeviceId();
  }, []);

  const handleNumberPress = (number) => {
    if (password.length < 6) {
      setPassword(prev => prev + number);
    }
  };

  const handleDelete = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  const checkTransactionStatus = async (walletId, signature, maxAttempts = 20) => {
    let attempts = 0;
    
    // 创建轮询函数
    const pollStatus = async () => {
      try {
        console.log(`Checking transaction status, attempt ${attempts + 1}`);
        const statusResponse = await api.getSolanaSwapStatus(walletId, signature);
        
        console.log('Transaction status response:', statusResponse);
        
        if (statusResponse.status === 'success') {
          if (statusResponse.data.status === 'confirmed') {
            return { success: true, data: statusResponse.data };
          } else if (statusResponse.data.status === 'failed') {
            return { success: false, error: 'Transaction failed' };
          }
        }
        
        // 如果还在处理中，继续轮询
        attempts++;
        if (attempts >= maxAttempts) {
          return { success: false, error: 'Transaction status query timeout' };
        }
        
        // 等待2秒后再次查询
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await pollStatus();
        
      } catch (error) {
        console.error('Error checking transaction status:', error);
        return { success: false, error: error.message };
      }
    };

    return await pollStatus();
  };

  const handlePasswordComplete = async (password) => {
    try {
      setProcessingStatus('Verifying password...');
      
      const response = await api.verifyPaymentPassword(deviceId, password);

      if (response.status === 'success') {
        setProcessingStatus('Submitting transaction...');
        await handlePasswordVerified(password);
      } else {
        setPassword('');
        setError('Incorrect password, please try again');
      }
    } catch (error) {
      console.error('[Password Verification] Processing error:', error);
      setPassword('');
      setError(error.message || 'Operation failed, please try again');
    }
  };

  const handlePasswordVerified = async (password) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Submitting transaction...');
      
      // 处理转账交易
      if (route.params?.purpose === 'transfer') {
        const { transferData } = route.params;
        const deviceId = await DeviceManager.getDeviceId();
        
        console.log('转账参数:', {
          walletId: transferData.walletId,
          deviceId: deviceId,
          to_address: transferData.to_address,
          amount: transferData.amount,
          token_address: transferData.token_address,
          is_native: transferData.is_native
        });

        // 导航到交易加载页面
        navigation.navigate('TransactionLoading', {
          ...transferData,
          wallet_id: transferData.walletId,
          walletId: transferData.walletId,
          device_id: deviceId,
          payment_password: password,
          token_symbol: transferData.token?.symbol || transferData.token_symbol,
          token: transferData.token?.symbol || transferData.token_symbol
        });
        return;
      }
      
      // 处理 Swap 交易
      else if (route.params?.purpose === 'swap') {
        const { swapData } = route.params;
        
        try {
          const quoteData = JSON.parse(swapData.quote_id);
          const numericWalletId = Number(swapData.walletId);
          
          const response = await api.executeSolanaSwap(numericWalletId, {
            device_id: swapData.deviceId,
            from_token: swapData.from_token,
            to_token: swapData.to_token,
            amount: quoteData.inAmount,
            quote_id: swapData.quote_id,
            payment_password: password,
            slippage: swapData.slippage
          });
          
          if (response.status === 'success') {
            let signature = response.data?.signature?.result || response.data?.signature;
            
            if (signature) {
              // 返回 Swap 页面
              navigation.navigate('MainStack', {
                screen: 'Tabs',
                params: {
                  screen: 'Swap',
                  params: {
                    transactionInfo: {
                      signature,
                      fromSymbol: swapData.fromSymbol,
                      toSymbol: swapData.toSymbol,
                      amount: swapData.amount,
                      fromToken: swapData.from_token,
                      toToken: swapData.to_token,
                      status: 'processing',
                      timestamp: Date.now()
                    }
                  }
                }
              });
              return;
            }
            
            throw new Error('未获取到有效的交易签名');
          }
          
          throw new Error(response?.message || '交易执行失败');
          
        } catch (error) {
          console.error('Swap 交易错误:', error);
          navigation.navigate('MainStack', {
            screen: 'Tabs',
            params: {
              screen: 'Swap',
              params: {
                showMessage: true,
                messageType: 'error',
                messageText: error.message || '交易执行失败'
              }
            }
          });
        }
      }
      // 处理其他回调
      else if (route.params?.onSuccess) {
        await route.params.onSuccess(password);
      }
      // 默认行为
      else {
        navigation.goBack();
      }
      
    } catch (error) {
      console.error('密码验证回调执行错误:', error);
      handleTransactionError(error.message || '交易失败，请重试');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // 添加统一的错误处理函数
  const handleTransactionError = (errorMessage) => {
    setIsProcessing(false);
    setProcessingStatus('');
    navigation.goBack();
    setTimeout(() => {
      Alert.alert('Notice', errorMessage);
    }, 300);
  };

  const renderNumberPad = () => {
    const numbers = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      ['', 0, 'delete']
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((num, j) => (
              <TouchableOpacity
                key={j}
                style={[
                  styles.numberButton,
                  num === '' && styles.emptyButton
                ]}
                onPress={() => {
                  if (num === 'delete') {
                    handleDelete();
                  } else if (num !== '') {
                    handleNumberPress(num);
                  }
                }}
                disabled={num === ''}
              >
                {num === 'delete' ? (
                  <Ionicons name="backspace-outline" size={24} color="#FFFFFF" />
                ) : (
                  <Text style={styles.numberText}>{num}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // 渲染加载状态
  const renderProcessingOverlay = () => {
    if (!isProcessing) return null;

    return (
      <View style={styles.processingOverlay}>
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color="#1FC595" />
          <Text style={styles.processingText}>{processingStatus}</Text>
          <Text style={styles.processingSubText}>Please do not close the app</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        title={title}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <Text style={styles.description}>
          Enter payment password to continue
        </Text>

        <View style={styles.passwordSection}>
          <PasswordDots
            length={6}
            filledCount={password.length}
          />

          <Animated.View 
            style={[
              styles.errorContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Ionicons name="alert-circle" size={16} color="#FF4B55" />
            <Text style={styles.errorText}>
              {error}
            </Text>
          </Animated.View>
        </View>

        {renderNumberPad()}
      </View>

      {renderProcessingOverlay()}

      {/* 添加 ToastView */}
      <ToastView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
  },
  description: {
    color: '#8E8E8E',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  numberPad: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 40,
    marginTop: 40,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#272C52',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  emptyButton: {
    backgroundColor: 'transparent',
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  passwordSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 85, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    position: 'absolute',
    top: 80,
  },
  errorText: {
    color: '#FF4B55',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  processingCard: {
    backgroundColor: '#1C2135',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  processingSubText: {
    color: '#8E8E8E',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  }
});