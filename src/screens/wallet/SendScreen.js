import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import Header from '../../components/common/Header';
import * as Clipboard from 'expo-clipboard';
import { api, getChainPath } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// 添加缓存时间常量
const CACHE_DURATION = 30 * 1000; // 30秒

export default function SendScreen({ navigation, route }) {
  const { selectedWallet } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('0');
  const [usdValue, setUsdValue] = useState('0.00');
  const [isValidating, setIsValidating] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [tokenList, setTokenList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, updateState] = useState();
  const forceUpdate = () => updateState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Selected wallet changed:', selectedWallet); // 添加日志
    if (selectedWallet) {
      loadTokens();
    }
  }, [selectedWallet]);

  useEffect(() => {
    // 添加日志查看选中的代币信息
    console.log('Selected token changed:', {
      token: selectedToken,
      price: selectedToken?.price,
      symbol: selectedToken?.symbol,
      balance: selectedToken?.balance_formatted
    });
  }, [selectedToken]);

  useEffect(() => {
    console.log('Amount changed:', {
      amount,
      balance: selectedToken?.balance_formatted,
      buttonState: getButtonState()
    });
    forceUpdate();
  }, [amount, selectedToken]);

  useEffect(() => {
    console.log('Selected token balance details:', {
      symbol: selectedToken?.symbol,
      balance_formatted: selectedToken?.balance_formatted,
      balance: selectedToken?.balance,
      decimals: selectedToken?.decimals
    });
  }, [selectedToken]);

  const loadTokens = async () => {
    if (!selectedWallet?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const deviceId = await DeviceManager.getDeviceId();
      console.log('[SendScreen] Loading tokens:', {
        deviceId,
        walletId: selectedWallet.id,
        chain: selectedWallet.chain
      });
      
      const response = await api.getTokensManagement(
        selectedWallet.id,
        deviceId,
        selectedWallet.chain
      );
      
      console.log('[SendScreen] Token response:', response);
      
      if (response?.status === 'success' && response.data?.data?.tokens) {
        const tokens = response.data.data.tokens;
        setTokenList(tokens);
        
        if (selectedToken) {
          const token = tokens.find(t => t.address === selectedToken.address);
          if (token) {
            setSelectedToken(token);
          }
        } else if (tokens.length > 0) {
          setSelectedToken(tokens[0]);
        }
      } else {
        console.error('[SendScreen] Invalid token response:', response);
        setError('Failed to load tokens');
      }
    } catch (error) {
      console.error('[SendScreen] Failed to load tokens:', error);
      setError('Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setRecipientAddress(text);
      }
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  };

  const handleScan = () => {
    // TODO: Implement QR code scanning
    navigation.navigate('QRScanner', {
      onScan: (address) => {
        setRecipientAddress(address);
      }
    });
  };

  const validateAddress = (address) => {
    // TODO: Implement proper address validation based on chain type
    return address.length > 30;
  };

  const validateAmount = (value) => {
    const numberValue = parseFloat(value);
    return !isNaN(numberValue) && numberValue > 0;
  };

  const handleContinue = async () => {
    if (!recipientAddress.trim()) {
      Alert.alert('错误', '请输入接收地址');
      return;
    }

    if (!validateAddress(recipientAddress)) {
      Alert.alert('错误', '无效的接收地址');
      return;
    }

    if (!amount || !validateAmount(amount)) {
      Alert.alert('错误', '无效的转账金额');
      return;
    }

    if (!selectedToken) {
      Alert.alert('错误', '请选择代币');
      return;
    }

    try {
      const deviceId = await DeviceManager.getDeviceId();
      
      const transactionData = {
        wallet_id: selectedWallet.id,
        to_address: recipientAddress,
        amount: amount,
        device_id: deviceId,
        chain: selectedWallet.chain,
        is_native: selectedToken.is_native || selectedToken.symbol === 'SOL'
      };

      // 只有在非原生代币时才添加 token_address
      if (!transactionData.is_native) {
        transactionData.token_address = selectedToken.address || selectedToken.token_address;
      }

      console.log('Sending transaction with data:', {
        ...transactionData,
        selectedToken: {
          symbol: selectedToken.symbol,
          decimals: selectedToken.decimals,
          is_native: selectedToken.is_native
        }
      });
      
      navigation.navigate('SendConfirmation', {
        recipientAddress,
        amount,
        token: selectedToken.symbol,
        tokenInfo: {
          address: selectedToken.address || selectedToken.token_address,
          symbol: selectedToken.symbol,
          decimals: selectedToken.decimals,
          is_native: selectedToken.is_native || selectedToken.symbol === 'SOL'
        },
        selectedWallet,
        transactionData
      });
      
    } catch (error) {
      console.error('准备交易失败:', error);
      Alert.alert('错误', '准备交易失败');
    }
  };

  // 修改 handleTokenSelect 函数
  const handleTokenSelect = async () => {
    try {
      if (!selectedWallet?.id) {
        console.log('No wallet selected');
        return;
      }

      // 直接使用已加载的 tokenList，避免重复请求
      if (tokenList.length > 0) {
        navigation.navigate('TokenListScreen', {
          tokens: tokenList,
          onSelect: (token) => {
            console.log('Selected token details:', token);
            // 确保保存完整的代币信息
            setSelectedToken({
              ...token,
              token_address: token.token_address || token.address,
              is_native: token.is_native || false,
              decimals: token.decimals || 9,
            });
            setAmount('');
          }
        });
      } else {
        // 如果没有缓存的代币列表，重新加载
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.getTokensManagement(
          selectedWallet.id,
          deviceId,
          selectedWallet.chain
        );

        if (response?.status === 'success' && response.data?.data?.tokens) {
          const tokens = response.data.data.tokens;
          navigation.navigate('TokenListScreen', {
            tokens,
            onSelect: (token) => {
              console.log('Selected token details:', token);
              // 确保保存完整的代币信息
              setSelectedToken({
                ...token,
                token_address: token.token_address || token.address,
                is_native: token.is_native || false,
                decimals: token.decimals || 9,
              });
              setAmount('');
            }
          });
        } else {
          throw new Error('Failed to load tokens');
        }
      }
    } catch (error) {
      console.error('Token selection error:', error);
      Alert.alert('错误', '加载代币列表失败');
    }
  };

  const formatLargeNumber = (number) => {
    // 直接返回原始输入的字符串，保持用户输入的格式
    if (!number) return '0';
    return number;
  };

  const formatBalance = (balance, decimals = 18) => {
    if (!balance) {
      return '0';
    }
    
    // 如果余额已经是格式化后的字符串（包含小数点），格式化为小数点后 4 位
    if (typeof balance === 'string' && balance.includes('.')) {
      const num = parseFloat(balance);
      if (num === 0) return '0';
      return num.toFixed(4);
    }
    
    // 处理数字或不包含小数点的字符串
    try {
      const balanceNum = parseFloat(balance);
      if (isNaN(balanceNum) || balanceNum === 0) return '0';
      
      // 如果余额是整数形式的大数（链上原始余额），需要根据精度进行格式化
      const tokenDecimals = decimals || 18;
      const formattedBalance = balanceNum / Math.pow(10, tokenDecimals);
      if (formattedBalance === 0) return '0';
      return formattedBalance.toFixed(4);
    } catch (error) {
      console.error('格式化余额出错:', error);
      return '0';
    }
  };

  const formatDisplayAmount = (value) => {
    if (!value || parseFloat(value) === 0) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) {
      return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
    return value;
  };

  const renderTokenSection = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tokens...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tokenContainer}>
        <TouchableOpacity 
          style={styles.tokenSelector}
          onPress={handleTokenSelect}
        >
          {selectedToken?.logo ? (
            <Image 
              source={{ uri: selectedToken.logo }} 
              style={styles.tokenLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.tokenLogo, styles.tokenLogoPlaceholder]} />
          )}
          <View style={styles.tokenDetails}>
            <Text style={styles.tokenSymbol} numberOfLines={1}>
              {selectedToken?.name || 'Select Token'}
            </Text>
            <Text style={styles.tokenBalance}>
              {formatBalance(selectedToken?.balance, selectedToken?.decimals)} {selectedToken?.symbol || ''}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const calculateUsdValue = (tokenAmount) => {
    // 添加更详细的日志
    console.log('Calculating USD value:', {
      tokenAmount,
      price: selectedToken?.price,
      symbol: selectedToken?.symbol,
      selectedToken: selectedToken
    });

    // 检查代币价格是否存在于 price_usd 字段
    const tokenPrice = selectedToken?.price_usd || selectedToken?.price;
    
    if (!tokenPrice || !tokenAmount) {
      console.log('Missing price or amount');
      return '0.00';
    }
    
    // 确保转换为数字
    const amount = parseFloat(tokenAmount);
    const price = parseFloat(tokenPrice);
    
    if (isNaN(amount) || isNaN(price)) {
      console.log('Invalid number conversion');
      return '0.00';
    }
    
    const value = amount * price;
    console.log('Final USD value:', value);
    
    return value.toFixed(2);
  };

  const handleQuickSelect = (type) => {
    if (!selectedToken?.balance_formatted) return;
    
    const balance = parseFloat(selectedToken.balance_formatted);
    let newAmount;
    
    switch (type) {
      case 'MAX':
        newAmount = balance.toString();
        break;
      case '75%':
        newAmount = (balance * 0.75).toFixed(selectedToken?.decimals || 4);
        break;
      case '50%':
        newAmount = (balance * 0.5).toFixed(selectedToken?.decimals || 4);
        break;
      default:
        return;
    }
    
    // 移除末尾的多余0
    newAmount = parseFloat(newAmount).toString();
    
    setAmount(newAmount);
    setUsdValue(calculateUsdValue(newAmount));
    forceUpdate();
  };

  const handleNumberPress = (number) => {
    let newAmount;
    // 如果当前金额是'0'且输入不是小数点，则直接替换
    if (amount === '0' && number !== '.') {
      newAmount = number.toString();
    } else {
      newAmount = amount + number.toString();
    }
    
    setAmount(newAmount);
    setUsdValue(calculateUsdValue(newAmount));
  };

  const handleDelete = () => {
    // 如果只剩一个字符，设为'0'
    if (amount.length <= 1) {
      setAmount('0');
    } else {
      // 删除最后一个字符
      const newAmount = amount.slice(0, -1);
      setAmount(newAmount);
    }
    setUsdValue(calculateUsdValue(amount));
  };

  const handleClear = () => {
    setAmount('0');
    setUsdValue('0.00');
    forceUpdate(); // 添加强制更新
  };

  const handleDot = () => {
    // 如果已经包含小数点，不做任何操作
    if (amount.includes('.')) {
      return;
    }
    const newAmount = amount + '.';
    setAmount(newAmount);
  };

  const renderNumberPad = () => {
    const numbers = [
      ['MAX', '1', '2', '3'],
      ['75%', '4', '5', '6'],
      ['50%', '7', '8', '9'],
      ['CLEAR', '.', '0', 'delete']
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((item, j) => (
              <TouchableOpacity
                key={j}
                style={[
                  styles.numberButton,
                  typeof item === 'string' && !Number.isInteger(parseFloat(item)) && styles.functionButton,
                  item === 'delete' && styles.deleteButton,
                  item === 'CLEAR' && styles.clearButton,
                ]}
                onPress={() => {
                  if (item === 'delete') {
                    handleDelete();
                  } else if (item === 'CLEAR') {
                    handleClear();
                  } else if (item === '.') {
                    handleDot();
                  } else if (item === 'MAX' || item === '75%' || item === '50%') {
                    handleQuickSelect(item);
                  } else if (Number.isInteger(parseFloat(item))) {
                    handleNumberPress(item);
                  }
                }}
              >
                {item === 'delete' ? (
                  <Ionicons name="backspace-outline" size={22} color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.numberText,
                    typeof item === 'string' && !Number.isInteger(parseFloat(item)) && styles.functionText,
                    (item === '75%' || item === '50%') && styles.percentText,
                    item === 'CLEAR' && styles.clearText,
                  ]}>
                    {item}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // 添加验证函数
  const validateTransaction = () => {
    const isValidAddress = recipientAddress.trim().length > 0;
    const isValidAmount = amount && amount.length > 0 && parseFloat(amount) > 0;
    const hasSelectedToken = !!selectedToken;
    const isExceedBalance = parseFloat(amount) > parseFloat(selectedToken?.balance_formatted || '0');

    return {
      isValidAddress,
      isValidAmount,
      hasSelectedToken,
      isExceedBalance
    };
  };

  // 修改 getButtonState 函数
  const getButtonState = () => {
    // 计算状态
    const amountNum = parseFloat(amount);
    const formattedBalance = parseFloat(selectedToken?.balance_formatted || '0');
    const hasSelectedToken = !!selectedToken;
    const isValidAmount = !isNaN(amountNum) && amountNum > 0;
    const isValidAddress = validateAddress(recipientAddress);
    
    // 直接比较用户输入的金额和格式化后的余额
    const isExceedBalance = isValidAmount && hasSelectedToken && amountNum > formattedBalance;
    
    console.log('State calculation (DETAILED):', {
      amount: amountNum,
      formattedBalance: formattedBalance,
      hasSelectedToken,
      isExceedBalance,
      isValidAddress,
      isValidAmount,
      decimals: selectedToken?.decimals,
      tokenBalance: selectedToken?.balance,
      tokenBalanceFormatted: selectedToken?.balance_formatted
    });

    if (!isValidAddress) return 'needAddress';
    if (!isValidAmount) return 'disabled';
    if (isExceedBalance) return 'warning';
    return 'enabled';
  };

  // 添加地址格式化函数
  const formatAddress = (address) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 在组件中使用
  useEffect(() => {
    const validation = validateTransaction();
    console.log('State calculation:', {
      amount: parseFloat(amount),
      balance: parseFloat(selectedToken?.balance_formatted || '0'),
      ...validation
    });
  }, [amount, recipientAddress, selectedToken]);

  // 修改 getTokenDetail 函数
  const getTokenDetail = async (walletId, token) => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      console.log('Getting token detail:', {
        walletId,
        token,
        deviceId
      });

      // 使用 api.getTokenDetails 而不是 api.get
      const response = await api.getTokenDetails(
        deviceId,
        walletId,
        token.symbol
      );
      
      console.log('Token detail response:', response);
      return response;
    } catch (error) {
      console.error('获取代币详情失败:', error);
      throw error;
    }
  };

  const handleSend = async (transactionData) => {
    try {
      setIsLoading(true);
      const response = await api.sendSolanaTransaction(selectedWallet.id, {
        ...transactionData,
        device_id: deviceId
      });

      if (response?.data?.transaction_hash) {
        // 保存交易信息，包括 walletId
        navigation.navigate('TransactionStatus', {
          txHash: response.data.transaction_hash,
          deviceId,
          walletId: selectedWallet.id,
          chain: 'SOL'
        });
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Send"
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.amountContainer, { marginTop: 20 }]}>
        <View style={styles.amountRow}>
          <Text style={styles.amountText}>
            {formatLargeNumber(amount)}
          </Text>
          <Text style={styles.tokenSymbolText}>
            {selectedToken?.symbol || selectedWallet?.chain}
          </Text>
        </View>
        <Text style={styles.usdValue}>≈ ${usdValue}</Text>
      </View>

      {/* 黑色容器包裹代币选择和地址输入 */}
      <View style={styles.darkContainer}>
        {/* 代币选择区域 */}
        <TouchableOpacity 
          style={styles.tokenSelectContainer}
          onPress={handleTokenSelect}
        >
          <View style={styles.tokenInfo}>
            {selectedToken?.logo ? (
              <Image
                source={{ uri: selectedToken.logo }}
                style={styles.tokenLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.tokenLogo, styles.tokenLogoPlaceholder]} />
            )}
            <View style={styles.tokenTextContainer}>
              <Text style={styles.tokenName}>{selectedToken?.name || 'Select Token'}</Text>
              <Text style={styles.tokenBalance}>
                {formatBalance(selectedToken?.balance, selectedToken?.decimals)} {selectedToken?.symbol || ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleTokenSelect}>
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 分隔线 */}
        <View style={styles.separator} />

        {/* 地址输入区域 */}
        <View style={styles.sendToContainer}>
          <View style={styles.addressInputContainer}>
            <Text style={styles.addressLabel}>To:</Text>
            <TextInput
              style={[
                styles.addressInput,
                !recipientAddress && styles.addressPlaceholder
              ]}
              placeholder="Enter address..."
              placeholderTextColor="#8E8E8E"
              value={recipientAddress}
              onChangeText={setRecipientAddress}
            />
          </View>
          <View style={styles.addressButtons}>
            <TouchableOpacity style={styles.addressButton} onPress={handleScan}>
              <Ionicons name="scan" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addressButton} onPress={handlePaste}>
              <Ionicons name="at" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.continueButton,
          getButtonState() === 'disabled' && styles.continueButtonDisabled,
          getButtonState() === 'warning' && styles.continueButtonWarning,
        ]}
        onPress={() => {
          console.log('Continue button pressed');
          handleContinue();
        }}
        disabled={getButtonState() !== 'enabled'}
      >
        <Text style={styles.continueButtonText}>
          {getButtonState() === 'warning'
            ? 'Insufficient Balance'
            : getButtonState() === 'needAddress'
              ? 'Enter Address'
              : 'Continue'}
        </Text>
      </TouchableOpacity>

      {renderNumberPad()}

      <Text style={styles.balanceText}>
        {formatBalance(selectedToken?.balance, selectedToken?.decimals)} {selectedToken?.symbol || ''}
      </Text>
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
    padding: 16,
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: 'bold',
    marginRight: 8,
  },
  tokenSymbolText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
  },
  usdValue: {
    color: '#8E8E8E',
    fontSize: 18,
    marginTop: 10,
  },
  darkContainer: {
    backgroundColor: '#272C52',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  tokenSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'transparent',
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tokenLogoPlaceholder: {
    backgroundColor: '#8E8E8E',
  },
  tokenTextContainer: {
    marginLeft: 12,
  },
  tokenName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenBalance: {
    color: '#8E8E8E',
    fontSize: 14,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },
  sendToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'transparent',
  },
  addressInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  addressLabel: {
    color: '#8E8E8E',
    fontSize: 16,
    marginRight: 10,
  },
  addressInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: 48,
    padding: 0,
  },
  addressPlaceholder: {
    color: '#8E8E8E',
  },
  addressButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  addressButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#1FC595',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(31, 197, 149, 0.3)', // 半透明的绿色
    opacity: 0.5,
  },
  continueButtonWarning: {
    backgroundColor: '#FFB800', // 警告黄色
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  continueButtonTextWarning: {
    color: '#000000', // 警告状态下文字颜色改为黑色
  },
  numberPad: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numberButton: {
    width: (width - 100) / 4,
    height: (width - 100) / 4,
    borderRadius: (width - 100) / 8,
    backgroundColor: 'rgba(39, 44, 82, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  functionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(31, 197, 149, 0.3)',
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  functionText: {
    color: '#1FC595',
    fontSize: 14,
    fontWeight: '600',
  },
  percentText: {
    fontSize: 15,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearButton: {
    backgroundColor: 'rgba(255, 87, 87, 0.1)',
    borderColor: 'rgba(255, 87, 87, 0.3)',
  },
  clearText: {
    color: '#FF5757',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E8E',
    fontSize: 14,
  },
  tokenContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    height: 44,
  },
  tokenDetails: {
    flex: 1,
  },
  tokenSymbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tokenPrice: {
    color: '#8E8E8E',
    fontSize: 14,
  },
  balanceText: {
    color: '#8E8E8E',
    fontSize: 14,
    marginTop: 10,
    marginLeft: 20,
  },
});