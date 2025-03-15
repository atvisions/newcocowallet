import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DeviceManager from '../../utils/DeviceManager';
import api from '../../services/api';
import styles from '../../styles/styles';

const SendConfirmation = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { transactionData } = route.params;
  const transactionDataRef = useRef(transactionData);

  // 使用 useEffect 来更新 ref
  useEffect(() => {
    if (transactionData) {
      console.log('Updating transaction data ref:', transactionData);
      transactionDataRef.current = transactionData;
    }
  }, [transactionData]);

  const handlePasswordSuccess = async (password) => {
    try {
      if (!transactionDataRef.current) {
        throw new Error('交易数据丢失');
      }

      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();

      // 打印完整的交易数据用于调试
      console.log('Using transaction data from ref:', {
        ...transactionDataRef.current,
        token_address: transactionDataRef.current.token_address
      });

      const params = {
        amount: transactionDataRef.current.amount,
        to_address: transactionDataRef.current.to_address,
        token_address: transactionDataRef.current.token_address,
        device_id: deviceId,
        payment_password: password
      };

      // 打印发送参数（隐藏密码）
      console.log('Sending transaction with params:', {
        ...params,
        payment_password: '***',
        token_address: params.token_address // 确保打印 token_address
      });

      // 再次确认 token_address 存在
      if (!params.token_address) {
        console.error('Token address is missing in params. Transaction data:', transactionDataRef.current);
        throw new Error('代币地址不能为空');
      }

      const response = await api.sendSolanaTransaction(
        transactionDataRef.current.wallet_id,
        params
      );

      console.log('Transaction response:', response);

      if (response?.status === 'success' && response?.data?.transaction_hash) {
        navigation.navigate('TransactionStatus', {
          txHash: response.data.transaction_hash,
          deviceId,
          walletId: transactionDataRef.current.wallet_id,
          chain: transactionDataRef.current.chain
        });
      } else {
        throw new Error(response?.message || '交易失败，请重试');
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      Alert.alert('错误', error?.message || '交易失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!transactionDataRef.current) {
      Alert.alert('错误', '交易数据不完整，请重试');
      return;
    }

    navigation.navigate('PaymentPassword', {
      onSuccess: handlePasswordSuccess
    });
  };

  return (
    <View style={styles.container}>
      {/* ... 其他 UI 组件 ... */}
      <TouchableOpacity 
        style={styles.confirmButton} 
        onPress={handleConfirm}
        disabled={isLoading || !transactionDataRef.current}
      >
        <Text style={styles.confirmButtonText}>
          {isLoading ? '处理中...' : '确认'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SendConfirmation; 