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
      setProcessingStatus('Submitting transaction...');
      
      // 验证密码
      const response = await api.verifyPaymentPassword(deviceId, password);

      if (response.status === 'success') {
        // 密码验证成功，更新状态提示
        setProcessingStatus('Submitting transaction...');
        
        // 执行交易
        await handlePasswordVerified(password);
      } else {
        // 密码错误，清空输入
        setPassword('');
        setError('Incorrect password, please try again');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setPassword('');
      setError(error.message || 'Operation failed, please try again');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handlePasswordVerified = async (password) => {
    console.log('Password verification successful, preparing to execute callback...');
    
    try {
      setIsProcessing(true);
      if (route.params?.onSuccess) {
        // 直接执行回调函数，传递密码
        await route.params.onSuccess(password);
      } else if (route.params?.purpose === 'send_transaction') {
        const { transactionData, nextScreen } = route.params;
        
        // 确保 transactionData 包含所有必要的信息
        console.log('Transaction data:', {
          ...transactionData,
          token_address: transactionData.token_address
        });
        
        // 导航到交易加载页面
        navigation.navigate(nextScreen || 'TransactionLoading', {
          ...transactionData,
          payment_password: password
        });
      } else if (route.params?.purpose === 'swap') {
        const { swapData } = route.params;
        
        console.log('Received Swap data:', {
          ...swapData,
          quote_id: swapData.quote_id ? '(length:' + swapData.quote_id.length + ')' : null,
          payment_password: '******'
        });
        
        try {
          // 解析 quote 数据
          const quoteData = JSON.parse(swapData.quote_id);
          
          console.log('Transaction amount check:', {
            displayAmount: swapData.amount,
            chainAmount: quoteData.inAmount,
          });

          // 确保 walletId 是数字类型
          const numericWalletId = Number(swapData.walletId);
          if (isNaN(numericWalletId)) {
            console.error(`Invalid wallet ID: ${swapData.walletId}, type: ${typeof swapData.walletId}`);
            throw new Error(`Invalid wallet ID: ${swapData.walletId}`);
          }

          // 构建交易参数
          const transactionParams = {
            device_id: swapData.deviceId,
            from_token: swapData.from_token,
            to_token: swapData.to_token,
            amount: quoteData.inAmount,
            quote_id: swapData.quote_id,
            payment_password: password,
            slippage: swapData.slippage
          };

          console.log('准备提交交易，参数:', {
            ...transactionParams,
            payment_password: '******',
            quote_id: '(length:' + swapData.quote_id.length + ')'
          });

          // 执行交易
          try {
            console.log('开始执行交易...');
            setProcessingStatus('正在提交交易...');
            
            // 执行交易
            const response = await api.executeSolanaSwap(numericWalletId, transactionParams);
            console.log('交易响应:', JSON.stringify(response, null, 2));
            
            if (response.status === 'success') {
              // 尝试提取签名
              let signature = null;
              
              // 检查 response.data.signature
              if (response.data && response.data.signature) {
                console.log('从 response.data.signature 中提取签名');
                signature = typeof response.data.signature === 'object' ? 
                  response.data.signature.result : response.data.signature;
                console.log('提取到的签名:', signature);
              }
              
              if (signature) {
                console.log('交易成功，准备返回 Swap 页面');
                
                // 立即返回上一页
                navigation.goBack();
                
                // 使用延时确保返回动画完成后再触发回调
                setTimeout(() => {
                  setIsProcessing(false);  // 关闭加载状态
                  setProcessingStatus('');
                  
                  // 如果有 onSuccess 回调，传递交易信息
                  if (route.params?.onSuccess) {
                    route.params.onSuccess({
                      signature,
                      fromToken: swapData.fromSymbol,
                      toToken: swapData.toSymbol,
                      amount: swapData.amount,
                      status: 'success'
                    });
                  }
                }, 300);
              } else {
                console.error('警告: 交易响应成功但未获取到签名');
                handleTransactionError('交易已提交，请稍后查看交易记录');
              }
            } else {
              console.error('交易执行失败:', response);
              handleTransactionError(response?.message || '交易执行失败');
            }
          } catch (error) {
            console.error('交易执行出错:', error);
            handleTransactionError(error?.message || '交易执行出错，请重试');
          }
        } catch (error) {
          console.error('Error processing transaction parameters:', error);
          
          // 返回 Swap 页面并显示错误消息
          navigation.navigate('MainStack', {
            screen: 'Tabs',
            params: {
              screen: 'Swap',
              params: {
                showMessage: true,
                messageType: 'error',
                messageText: error.message || 'Transaction parameter error'
              }
            }
          });
        }
      } else {
        // 默认行为
        navigation.goBack();
      }
    } catch (error) {
      console.error('Password verification callback execution error:', error);
      
      // 返回上一页并显示错误
      navigation.goBack();
      setTimeout(() => {
        Alert.alert('Error', error?.message || 'Transaction failed, please try again');
      }, 300);
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
      Alert.alert('提示', errorMessage);
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