import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';

export default function TransactionLoadingScreen({ navigation, route }) {
  const [status, setStatus] = useState('processing');
  const [transactionStep, setTransactionStep] = useState('CREATING');
  const [error, setError] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // 交易状态描述
  const statusMessages = {
    CREATING: {
      title: 'Preparing Transaction',
      subtitle: 'Preparing transaction data...'
    },
    CHECKING_ACCOUNTS: {
      title: 'Checking Accounts',
      subtitle: 'Verifying account information...'
    },
    SIMULATING: {
      title: 'Simulating Transaction',
      subtitle: 'Simulating transaction execution...'
    },
    SENDING: {
      title: 'Sending Transaction',
      subtitle: 'Sending transaction to blockchain...'
    },
    CONFIRMING: {
      title: 'Confirming Transaction',
      subtitle: 'Waiting for blockchain confirmation...'
    },
    SUCCESS: {
      title: 'Transaction Successful',
      subtitle: 'Transaction has been confirmed'
    },
    FAILED: {
      title: 'Transaction Failed',
      subtitle: 'Please check your input and try again'
    }
  };
  
  useEffect(() => {
    sendTransaction();
  }, []);

  const sendTransaction = async () => {
    try {
      const transactionData = route?.params;
      if (!transactionData) {
        throw new Error('Missing transaction data');
      }

      const { amount, token, tokenInfo, selectedWallet, wallet_id, is_native } = transactionData;
      
      // 确保有钱包信息
      if (!selectedWallet && !wallet_id) {
        console.error('Transaction data:', transactionData);
        throw new Error('Missing wallet information');
      }
      
      // 如果没有selectedWallet对象但有wallet_id，构造必要的钱包信息
      const effectiveWallet = selectedWallet || {
        id: wallet_id,
        chain: transactionData.chain || 'SOL'
      };

      // 打印完整的交易数据（用于调试）
      console.log('Transaction data before sending:', {
        ...transactionData,
        payment_password: '***'
      });
      
      // 构建基本参数
      const params = {
        device_id: await DeviceManager.getDeviceId(),
        to_address: transactionData.to_address,
        amount: amount,
        payment_password: transactionData.password,
        is_native: transactionData.is_native
      };

      // 处理代币地址
      // 1. 如果是原生 SOL 转账，不添加 token_address
      // 2. 如果是其他代币，确保添加正确的 token_address
      if (!transactionData.is_native) {
        const tokenAddress = transactionData.token_address || tokenInfo?.address;
        if (!tokenAddress) {
          throw new Error('代币地址不能为空');
        }
        params.token_address = tokenAddress;
      }

      console.log('Sending Solana transaction with params:', {
        ...params,
        payment_password: '***'
      });

      const response = await api.sendSolanaTransaction(
        effectiveWallet.id,
        params
      );

      if (!response) {
        throw new Error('Network error, no response received');
      }

      console.log('Transaction response:', response);
      
      if (response.status === 'error') {
        throw {
          message: response.message || 'Transaction failed',
          error_code: response.error_code || 'UNKNOWN_ERROR'
        };
      }
      
      if (response && response.status === 'success') {
        // 获取交易哈希 - 添加更多日志
        const txHash = response.data?.tx_hash || response.data?.transaction_hash;
        console.log('Transaction hash extraction:', {
          responseData: response.data,
          extractedHash: txHash,
          tx_hash: response.data?.tx_hash,
          transaction_hash: response.data?.transaction_hash
        });
        
        setTransactionHash(txHash);
        
        if (txHash) {
          console.log('Starting polling with hash:', txHash);
          // 开始轮询交易状态
          startPollingTransactionStatus(transactionData, txHash);
        } else {
          // 如果没有交易哈希但状态是成功，直接导航到成功页面
          setStatus('success');
          console.log('No hash available, navigating to success screen');
          handleSuccess(null, transactionData);
        }
      } else {
        throw new Error(response?.message || '交易失败');
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      
      const errorMessage = error.message || '交易失败，请稍后重试';
      const errorCode = error.error_code || 'UNKNOWN_ERROR';
      
      if (errorCode === 'NETWORK_ERROR') {
        Alert.alert(
          '网络错误',
          '请检查网络连接并重试',
          [
            { 
              text: '取消', 
              style: 'cancel',
              onPress: () => handleTransactionError(errorMessage, errorCode)
            },
            { 
              text: '重试', 
              onPress: () => {
                setStatus('processing');
                setTransactionStep('CREATING');
                sendTransaction();
              }
            }
          ]
        );
        return;
      }
      
      handleTransactionError(errorMessage, errorCode);
    }
  };
  
  const startPollingTransactionStatus = async (transactionData, txHash) => {
    try {
      setTransactionStep('CONFIRMING');
      
      // 获取设备ID
      const deviceId = await DeviceManager.getDeviceId();
      
      // 设置最大重试次数和轮询间隔
      const maxRetries = 30;
      const pollingInterval = 2000; // 2秒
      
      // 开始轮询
      const pollStatus = async () => {
        try {
          const response = await api.getTransactionStatus(
            deviceId,
            txHash,
            transactionData.wallet_id,
            'SOL'
          );

          console.log('Transaction status response:', response);
          
          if (response.status === 'success' && response.data) {
            const txStatus = response.data.status?.toUpperCase();
            
            // 根据不同状态处理
            switch(txStatus) {
              case 'CONFIRMED':
              case 'SUCCESS':
                setStatus('success');
                handleSuccess(txHash, transactionData);
                return true;
              
              case 'FAILED':
                throw new Error(response.data.error || '交易失败');
              
              case 'PENDING':
              case 'CONFIRMING':
                return false;
              
              default:
                if (retryCount >= maxRetries) {
                  throw new Error('交易确认超时');
                }
                return false;
            }
          } else {
            throw new Error(response.message || '获取交易状态失败');
          }
        } catch (error) {
          console.error('Poll status error:', error);
          throw error;
        }
      };
      
      // 执行轮询
      while (retryCount < maxRetries) {
        try {
          const isComplete = await pollStatus();
          if (isComplete) break;
          
          setRetryCount(count => count + 1);
          await new Promise(resolve => setTimeout(resolve, pollingInterval));
        } catch (error) {
          if (error.message.includes('超时') || retryCount >= maxRetries - 1) {
            throw error;
          }
          // 其他错误继续重试
          setRetryCount(count => count + 1);
          await new Promise(resolve => setTimeout(resolve, pollingInterval));
        }
      }
      
      // 如果达到最大重试次数
      if (retryCount >= maxRetries) {
        throw new Error('交易确认超时，请在区块浏览器中查看交易状态');
      }
      
    } catch (error) {
      console.error('Transaction polling failed:', error);
      setStatus('error');
      navigation.replace('TransactionFailed', {
        error: error.message || '交易确认失败',
        error_code: error.error_code || 'CONFIRMATION_ERROR',
        selectedWallet: transactionData.selectedWallet,
        recipientAddress: transactionData.to_address,
        amount: transactionData.amount,
        token: transactionData.token_symbol || transactionData.token,
        tokenInfo: transactionData.tokenInfo
      });
    }
  };

  const handleSuccess = (txHash, data) => {
    // Navigate to transaction success screen first
    navigation.replace('TransactionSuccess', {
      amount: data.amount,
      token: data.token_symbol || data.token,
      recipientAddress: data.to_address,
      transactionHash: txHash
    });
  };

  const handleTransactionError = (errorMessage, errorCode) => {
    setStatus('error');
    navigation.replace('TransactionFailed', {
      error: errorMessage,
      error_code: errorCode,
      selectedWallet: route.params.selectedWallet,
      recipientAddress: route.params.to_address,
      amount: route.params.amount,
      token: route.params.token_symbol || route.params.token,
      tokenInfo: route.params.tokenInfo
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
            <Text style={styles.title}>{statusMessages[transactionStep]?.title || 'Processing'}</Text>
            <Text style={styles.message}>{statusMessages[transactionStep]?.subtitle || 'Processing your transaction, please wait...'}</Text>
            {retryCount > 0 && (
              <Text style={styles.retryText}>Confirming ({retryCount}/30)</Text>
            )}
          </>
        )}
        
        {status === 'success' && (
          <>
            <Text style={styles.title}>Transaction Successful</Text>
            <Text style={styles.message}>Your transaction has been successfully submitted</Text>
            {transactionHash && (
              <Text style={styles.hash}>Transaction Hash: {transactionHash}</Text>
            )}
          </>
        )}
        
        {status === 'error' && (
          <>
            <Text style={styles.title}>Transaction Failed</Text>
            <Text style={styles.message}>{error}</Text>
          </>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  hash: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#272C52',
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    fontSize: 14,
    color: '#8E8E8E',
    marginTop: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1FC595',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIndicator: {
    backgroundColor: '#FF4B55',
  },
});