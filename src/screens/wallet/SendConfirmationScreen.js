import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import Header from '../../components/common/Header';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';

export default function SendConfirmationScreen({ navigation, route }) {
  const { recipientAddress, amount, token, tokenInfo, transactionData } = route.params;
  const { selectedWallet } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInsufficientGas, setHasInsufficientGas] = useState(false);
  const [tokenList, setTokenList] = useState([]);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    if (!selectedWallet?.id) return;

    try {
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getWalletTokens(
        deviceId,
        selectedWallet.id,
        selectedWallet.chain
      );

      if (response?.data?.tokens) {
        setTokenList(response.data.tokens);
        checkGasBalance(response.data.tokens);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  };

  const checkGasBalance = (tokens) => {
    const chainType = (tokenInfo.chain || selectedWallet.chain || '').toUpperCase();
    const isEVM = chainType === 'ETH' || chainType === 'EVM' || chainType === 'BASE';
    
    if (isEVM) {
      // 检查 ETH 余额是否足够支付 gas
      const nativeToken = tokens.find(t => t.is_native);
      const ethBalance = parseFloat(nativeToken?.balance_formatted || 0);
      const estimatedGas = 0.001; // 预估 gas 费用
      
      if (ethBalance < estimatedGas) {
        setHasInsufficientGas(true);
      }
    }
  };

  const handleConfirm = () => {
    console.log('Starting confirmation with transaction data:', transactionData);
    setIsProcessing(true);
    
    // 检查是否是Solana链上的代币转账
    const chainType = (tokenInfo.chain || selectedWallet.chain || '').toUpperCase();
    const isSolana = chainType === 'SOL' || chainType === 'SOLANA';
    const isNative = tokenInfo.is_native || tokenInfo.symbol === 'SOL';
    
    // 构建交易数据
    const finalTransactionData = {
      ...transactionData,
      is_native: isNative
    };

    // 只有在非原生代币时才添加 token_address
    if (!isNative) {
      finalTransactionData.token_address = transactionData.token_address || tokenInfo?.address;
      // 如果是Solana代币，添加创建代币账户的标志
      if (isSolana) {
        finalTransactionData.create_associated_token_account = true;
      }
    }
    
    navigation.navigate('PaymentPassword', {
      title: 'Confirm Transaction',
      purpose: 'send_transaction',
      transactionData: finalTransactionData,
      onSuccess: async (password) => {
        try {
          const finalData = {
            ...finalTransactionData,
            password
          };
          
          console.log('Navigating to TransactionLoading with data:', {
            ...finalData,
            password: '***'
          });
          
          navigation.replace('TransactionLoading', finalData);
        } catch (error) {
          console.error('Transaction preparation error:', error);
          setIsProcessing(false);
          Alert.alert(
            'Network Error',
            'Please check your network connection and try again',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsProcessing(false) },
              { text: 'Retry', onPress: () => handleConfirm() }
            ]
          );
        }
      },
      onCancel: () => {
        setIsProcessing(false);
      }
    });
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return address.length > 16
      ? `${address.slice(0, 8)}...${address.slice(-8)}`
      : address;
  };

  // 获取网络原生代币符号
  const getNativeTokenSymbol = () => {
    const chainType = (tokenInfo.chain || selectedWallet.chain || '').toUpperCase();
    switch (chainType) {
      case 'ETH':
      case 'EVM':
        return 'ETH';
      case 'BASE':
        return 'ETH';
      case 'SOL':
      case 'SOLANA':
        return 'SOL';
      default:
        return 'ETH';
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Confirm Transaction"
        onBack={() => navigation.goBack()}
      />
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.card}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amount}>{amount} {token}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>
                {formatAddress(selectedWallet?.address)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>
                {formatAddress(recipientAddress)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network Fee</Text>
              <Text style={[
                styles.detailValue,
                hasInsufficientGas && styles.warningText
              ]}>
                ~0.001 {getNativeTokenSymbol()}
              </Text>
            </View>

            {hasInsufficientGas && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={20} color="#FFB800" />
                <Text style={styles.warningText}>
                  Insufficient {getNativeTokenSymbol()} balance for gas fee. Please ensure you have enough {getNativeTokenSymbol()} to cover the network fee.
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.confirmButton,
            isProcessing && styles.confirmButtonDisabled,
            hasInsufficientGas && styles.warningButton
          ]}
          onPress={handleConfirm}
          disabled={isProcessing || hasInsufficientGas}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {hasInsufficientGas ? 
                `Insufficient ${getNativeTokenSymbol()} for Gas` : 
                'Confirm'
              }
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#272C52',
    borderRadius: 16,
    padding: 20,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#8E8E8E',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(142, 142, 142, 0.1)',
    marginVertical: 20,
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    color: '#FFB800',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  warningButton: {
    backgroundColor: '#FFB800',
  }
});
