import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  RefreshControl,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { useWallet } from '../../contexts/WalletContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SlippageSettingModal from '../swap/SlippageSettingModal';
import { formatTokenAmount } from '../../utils/format';
import BigNumber from 'bignumber.js';
import { logger } from '../../utils/logger';
import axios from 'axios';
import { BASE_URL } from '../../config/constants'; // 确保导入BASE_URL

const SkeletonLoader = ({ width, height, style }) => {
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: '#2A2F45',
          borderRadius: 4,
          opacity: 0.6
        },
        style,
      ]}
    />
  );
};

// 添加防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 添加默认代币配置
const DEFAULT_TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    token_address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    is_visible: true,
    balance_formatted: '0',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    is_visible: true,
    balance_formatted: '0',
  }
};

const formatDisplayAmount = (amount, decimals) => {
  try {
    if (!amount || decimals === undefined) {
      console.log('formatDisplayAmount: 无效的输入参数', { amount, decimals });
      return '0';
    }
    
    console.log('formatDisplayAmount: 开始处理金额', {
      原始金额: amount,
      代币精度: decimals,
      金额类型: typeof amount
    });

    // 将金额转换为 BigNumber 以确保精确计算
    const amountBN = new BigNumber(amount);
    if (amountBN.isNaN()) {
      console.error('formatDisplayAmount: 金额转换为BigNumber失败');
      return '0';
    }

    const divisor = new BigNumber(10).pow(decimals);
    const formattedAmount = amountBN.dividedBy(divisor);
    
    console.log('formatDisplayAmount: 金额转换过程', {
      原始金额: amount,
      代币精度: decimals,
      除数: divisor.toString(),
      转换后金额: formattedAmount.toString()
    });
    
    // 根据金额大小使用不同的显示精度
    let displayDecimals;
    const absAmount = formattedAmount.abs();
    
    if (absAmount.isZero()) {
      displayDecimals = 2;
    } else if (absAmount.isLessThan(0.01)) {
      displayDecimals = 6;
    } else if (absAmount.isLessThan(1)) {
      displayDecimals = 4;
    } else if (absAmount.isLessThan(1000)) {
      displayDecimals = 2;
    } else {
      displayDecimals = 2;
    }
    
    const result = formattedAmount.toFormat(displayDecimals, {
      groupSize: 3,
      groupSeparator: ',',
      decimalSeparator: '.'
    });

    console.log('formatDisplayAmount: 最终显示结果', {
      显示精度: displayDecimals,
      格式化结果: result
    });

    return result;
  } catch (error) {
    console.error('formatDisplayAmount: 格式化金额错误:', error);
    return '0';
  }
};

const QuoteDetails = ({ quote, fees, toToken, fromToken, isQuoteLoading, calculateExchangeRate, formatTokenAmount, formatPriceImpact, tokenPrices }) => {
  if (isQuoteLoading) {
    return (
      <View style={styles.quoteDetailsContainer}>
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>Exchange Rate</Text>
          <SkeletonLoader width={100} height={16} />
        </View>
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>Price Impact</Text>
          <SkeletonLoader width={80} height={16} />
        </View>
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>Minimum Received</Text>
          <SkeletonLoader width={120} height={16} />
        </View>
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>Network Fee</Text>
          <SkeletonLoader width={80} height={16} />
        </View>
      </View>
    );
  }

  if (!quote || !fromToken || !toToken) {
    return null;
  }

  const exchangeRate = calculateExchangeRate(quote, fromToken, toToken);
  const priceImpact = quote.price_impact ? formatPriceImpact(quote.price_impact) : '0%';
  const minimumReceived = quote.minimum_received 
    ? formatDisplayAmount(quote.minimum_received, toToken.decimals)
    : '0';
  
  const isPriceImpactHigh = new BigNumber(quote.price_impact || 0).isGreaterThan(0.05);
  
  // 获取市场价格
  const fromTokenPrice = tokenPrices[fromToken.token_address]?.price;
  const toTokenPrice = tokenPrices[toToken.token_address]?.price;
  const marketPrice = fromTokenPrice && toTokenPrice 
    ? `$${fromTokenPrice.toFixed(2)} / $${toTokenPrice.toFixed(2)}`
    : 'Loading...';

  // 处理网络费用显示
  const networkFee = quote.network_fee || (fees ? fees : 'Calculating...');
  const networkFeeDisplay = typeof networkFee === 'string' ? networkFee : 'Calculating...';

  return (
    <View style={styles.quoteDetailsContainer}>
      <View style={styles.quoteRow}>
        <Text style={styles.quoteLabel}>Exchange Rate</Text>
        <Text style={styles.quoteValue}>{exchangeRate}</Text>
      </View>
      <View style={styles.quoteRow}>
        <Text style={styles.quoteLabel}>Price Impact</Text>
        <Text style={[
          styles.quoteValue,
          isPriceImpactHigh ? styles.warningText : null
        ]}>
          {priceImpact}
        </Text>
      </View>
      <View style={styles.quoteRow}>
        <Text style={styles.quoteLabel}>Minimum Received</Text>
        <Text style={styles.quoteValue}>
          {minimumReceived} {toToken.symbol}
        </Text>
      </View>
      <View style={styles.quoteRow}>
        <Text style={styles.quoteLabel}>Network Fee</Text>
        <Text style={styles.quoteValue}>
          {networkFeeDisplay === 'Calculating...' ? 'Calculating...' : `${networkFeeDisplay} SOL`}
        </Text>
      </View>
    </View>
  );
};

const TransactionStatusBar = ({ status, message }) => {
  // 完全不显示任何内容
  return null;
};

const SwapScreen = ({ navigation, route }) => {
  const { selectedWallet } = useWallet();
  const [userTokens, setUserTokens] = useState([]);
  const [swapTokens, setSwapTokens] = useState([]);
  const [fromToken, setFromToken] = useState(DEFAULT_TOKENS.SOL);
  const [toToken, setToToken] = useState(DEFAULT_TOKENS.USDC);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [fees, setFees] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [tokenPrices, setTokenPrices] = useState({});
  const [slippage, setSlippage] = useState('0.5'); // 默认滑点 0.5%
  const [isSlippageModalVisible, setIsSlippageModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState(false);
  const [priceChange, setPriceChange] = useState(0);
  const insets = useSafeAreaInsets();
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState('idle'); // idle, loading, success, failed
  const [transactionError, setTransactionError] = useState('');
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loadingText, setLoadingText] = useState('');
  const [estimatedFees, setEstimatedFees] = useState(null);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const spinAnim = useState(new Animated.Value(0))[0];

  // 1. 首先在组件顶部添加状态
  const [txStatus, setTxStatus] = useState(null);

  // 使用 useRef 而不是 useState 来跟踪定时器和计数器
  const transactionStatusRef = React.useRef('idle');
  const statusCheckTimerRef = React.useRef(null);
  const maxCheckAttemptsRef = React.useRef(0);
  const messageTimeoutRef = useRef(null);
  const currentProcessingTx = useRef(null);

  // 添加一个 ref 来跟踪当前正在进行的轮询
  const isPolling = useRef(false);

  // 添加一个全局状态来跟踪消息显示
  const [hasShownPending, setHasShownPending] = useState(false);
  const [hasShownSuccess, setHasShownSuccess] = useState(false);
  const [hasShownFailed, setHasShownFailed] = useState(false);

  // 使用 useFocusEffect 监听页面焦点
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);

      // 离开页面时的清理工作
      return () => {
        console.log('离开 Swap 页面，重置交易状态');
        setIsScreenFocused(false);
        // 只重置交易相关的状态
        setAmount('');
        setQuote(null);
        setFees(null);
        setIsQuoteLoading(false);
        setIsInsufficientBalance(false);
        setPriceChange(0);
        // 停止定时刷新
        if (quoteRefreshInterval.current) {
          clearInterval(quoteRefreshInterval.current);
          quoteRefreshInterval.current = null;
        }
        // 停止交易状态检查
        // stopTransactionStatusCheck();
        // 不再重置 fromToken 和 toToken
      };
    }, [])
  );

  // 2. 修改 useEffect 处理路由参数部分
  useEffect(() => {
    const params = route.params;
    if (!params?.transactionInfo) return;
  
    console.log('【交易状态检查】收到路由参数:', params);
    const { signature } = params.transactionInfo;
    
    if (signature) {
      console.log('【交易状态检查】开始处理交易:', signature);
      // 开始轮询交易状态
      pollTransactionStatus(signature);
    }
  
    // 清除路由参数
    navigation.setParams({ transactionInfo: null });
  }, [route.params?.transactionInfo]);
  
  // 添加一个静默加载函数
  const silentLoadUserTokens = async (retryCount = 3, delay = 2000) => {
    for (let i = 0; i < retryCount; i++) {
      try {
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.getTokensManagement(selectedWallet.id, deviceId, 'solana');

        if (response.status === 'success' && response.data?.data?.tokens) {
          const tokens = response.data.data.tokens.map(token => ({
            ...token,
            token_address: token.address,
            balance_formatted: token.balance_formatted || '0'
          }));
          
          setUserTokens(tokens);
          
          // 更新 fromToken 和 toToken
          if (fromToken) {
            const updatedFromToken = tokens.find(token => 
              token.address === fromToken.token_address || 
              token.address === fromToken.address
            );
            if (updatedFromToken) {
              setFromToken({
                ...updatedFromToken,
                token_address: updatedFromToken.address
              });
            }
          }
          
          if (toToken) {
            const updatedToToken = tokens.find(token => 
              token.address === toToken.token_address || 
              token.address === toToken.address
            );
            if (updatedToToken) {
              setToToken({
                ...updatedToToken,
                token_address: updatedToToken.address
              });
            }
          }
          
          // 如果成功更新了余额，直接返回
          return true;
        }
      } catch (error) {
        console.error(`Silent load user tokens error (attempt ${i + 1}):`, error);
      }
      
      // 如果不是最后一次尝试，等待指定时间后重试
      if (i < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  };

  // 1. 修改 pollTransactionStatus 函数
  const pollTransactionStatus = async (signature) => {
    if (isPolling.current) {
      console.log('【Transaction Status】Already polling, skip');
      return;
    }

    console.log('【Transaction Status】Start polling:', signature);
    
    if (!signature || !selectedWallet?.id) {
      console.error('【Transaction Status】Missing required params:', { signature, walletId: selectedWallet?.id });
      return;
    }

    isPolling.current = true;
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setIsLoading(false);
        setLoadingText('');
        showTransactionMessage('error', 'Transaction status query timeout');
        isPolling.current = false;
        return;
      }

      try {
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.getSolanaSwapStatus(
          selectedWallet.id,
          signature,
          deviceId
        );

        if (response.status === 'success' && response.data) {
          const status = response.data.status;
          
          if (status === 'pending') {
            if (!hasShownPending) {
              setHasShownPending(true);
              setIsLoading(true);
              setLoadingText('Transaction is being confirmed');
              showTransactionMessage('info', 'Transaction is being confirmed');
            }
            attempts++;
            setTimeout(checkStatus, 2000);
          } else if (status === 'confirmed') {
            if (!hasShownSuccess) {
              setHasShownSuccess(true);
              setIsLoading(false);
              setLoadingText('');
              showTransactionMessage('success', 'Transaction confirmed');
            }
            isPolling.current = false;
            return;
          } else if (status === 'failed') {
            if (!hasShownFailed) {
              setHasShownFailed(true);
              setIsLoading(false);
              setLoadingText('');
              showTransactionMessage('error', 'Transaction failed');
            }
            isPolling.current = false;
            return;
          }
        }
      } catch (error) {
        console.error('【Transaction Status】Check error:', error);
        if (!hasShownSuccess && !hasShownFailed) {
          attempts++;
          setTimeout(checkStatus, 2000);
        } else {
          isPolling.current = false;
        }
      }
    };

    await checkStatus();
  };
  
  // 3. 修改消息显示函数
  const showTransactionMessage = (type, text) => {
    // 如果已经显示了相同的消息，不重复显示
    if (messageText === text && messageType === type && showMessage) {
      return;
    }
    
    // 清除之前的定时器
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    
    console.log('【交易状态检查】显示消息:', { type, text });
    setMessageType(type);
    setMessageText(text);
    setShowMessage(true);
    
    // 只有在不是 pending 状态时才设置自动隐藏
    if (text !== 'Transaction is being confirmed') {
      messageTimeoutRef.current = setTimeout(() => {
        setShowMessage(false);
        setMessageType('');
        setMessageText('');
      }, 3000);
    }
  };

  // 5. 组件卸载时清理状态
  useEffect(() => {
    return () => {
      setTxStatus(null);
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // 创建一个 ref 来存储定时器
  const quoteRefreshInterval = React.useRef(null);

  // 防抖处理的报价请求
  const debouncedGetQuote = React.useCallback(
    debounce(async () => {
      if (!isScreenFocused || !fromToken || !toToken || !amount) {
        return;
      }
      await getQuoteAndFees();
    }, 1000),
    [fromToken, toToken, amount, isScreenFocused]
  );

  // 修改报价刷新机制
  useEffect(() => {
    // 只有在有金额输入且金额不为0时才请求报价
    if (isScreenFocused && amount && amount !== '0' && fromToken && toToken) {
      debouncedGetQuote();
    } else {
      // 如果没有输入金额或金额为0，清空报价
      setQuote(null);
      setFees(null);
    }
  }, [amount, slippage]); // 只监听金额和滑点的变化

  useEffect(() => {
    loadUserTokens();
    loadSwapTokens();
  }, [selectedWallet]);

  // 添加新的 useEffect 来获取代币价格
  useEffect(() => {
    let isActive = true;
    
    const fetchTokenPrices = async () => {
      if (!fromToken || !toToken || !selectedWallet || !isActive) return;
      
      try {
        const deviceId = await DeviceManager.getDeviceId();
        const tokenAddresses = [
          fromToken.token_address || fromToken.address,
          toToken.token_address || toToken.address
        ].filter(Boolean);
        
        if (tokenAddresses.length === 0) return;
        
        console.log('【价格更新】获取代币价格:', {
          代币: tokenAddresses.join(',')
        });
        
        const response = await api.getSolanaTokenPrices(
          selectedWallet.id,
          deviceId,
          tokenAddresses
        );
        
        if (response.status === 'success' && response.data?.prices && isActive) {
          setTokenPrices(response.data.prices);
        }
      } catch (error) {
        console.error('获取代币价格失败:', error);
      }
    };

    fetchTokenPrices();
    
    const priceInterval = setInterval(fetchTokenPrices, 60000);
    return () => {
      isActive = false;
      clearInterval(priceInterval);
    };
  }, [fromToken?.token_address, toToken?.token_address, selectedWallet]);

  useEffect(() => {
    // Check if amount exceeds balance
    if (fromToken && amount) {
      try {
        const balance = fromToken?.balance_formatted ? parseFloat(fromToken.balance_formatted.replace(/,/g, '')) : 0;
        const inputAmount = parseFloat(amount);
        setIsInsufficientBalance(!isNaN(balance) && !isNaN(inputAmount) && inputAmount > balance);
      } catch (error) {
        console.error('余额检查错误:', error);
        setIsInsufficientBalance(false);
      }
    } else {
      setIsInsufficientBalance(false);
    }
  }, [fromToken, amount]);

  useEffect(() => {
    if (quote) {
      // 直接使用 price_impact
      const impact = parseFloat(quote.price_impact || 0);
      console.log('价格影响数据:', {
        '原始price_impact': quote.price_impact,
        '当前priceChange': impact,
        '解析后的impact': impact
      });
      setPriceChange(impact); // 直接使用 impact，不再取反
    }
  }, [quote]);

  useEffect(() => {
    if (route.params?.showMessage) {
      setShowMessage(true);
      setMessageType(route.params.messageType);
      setMessageText(route.params.messageText);
      
      // 3秒后自动隐藏消息
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [route.params]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserTokens();
    setIsRefreshing(false);
  };

  const loadUserTokens = async () => {
    try {
      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();
      
      // 使用正确的 API 方法
      const response = await api.getTokensManagement(selectedWallet.id, deviceId, 'solana');

      console.log('Load user tokens response:', response);

      if (response.status === 'success' && response.data?.data?.tokens) {
        // 注意这里：response.data.data.tokens 才是正确的路径
        const tokens = response.data.data.tokens.map(token => ({
          ...token,
          token_address: token.address,  // 确保 token_address 存在
          balance_formatted: token.balance_formatted || '0'
        }));
        
        setUserTokens(tokens);
        
        // 更新 fromToken 如果存在
        if (fromToken) {
          const updatedFromToken = tokens.find(token => 
            token.address === fromToken.token_address || 
            token.address === fromToken.address
          );
          if (updatedFromToken) {
            setFromToken({
              ...updatedFromToken,
              token_address: updatedFromToken.address
            });
          }
        }
        
        // 更新 toToken 如果存在
        if (toToken) {
          const updatedToToken = tokens.find(token => 
            token.address === toToken.token_address || 
            token.address === toToken.address
          );
          if (updatedToToken) {
            setToToken({
              ...updatedToToken,
              token_address: updatedToToken.address
            });
          }
        }
      }
    } catch (error) {
      console.error('Load user tokens error:', error);
      Alert.alert('Error', 'Failed to load token list');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSwapTokens = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      
      // 确保使用数字类型的钱包ID
      const numericWalletId = Number(selectedWallet.id);
      
      console.log('加载交换代币列表:', {
        钱包ID: numericWalletId,
        设备ID: deviceId
      });
      
      const response = await api.getSolanaSwapTokens(
        numericWalletId,  // 使用数字类型的钱包ID
        deviceId
      );
      
      if (response?.status === 'success' && response.data?.tokens) {
        setSwapTokens(response.data.tokens);
      }
    } catch (error) {
      console.error('加载交换代币列表失败:', error);
    }
  };

  const handleAmountChange = (value) => {
    // 移除非数字字符，保留一个小数点
    let cleanedValue = value.replace(/[^\d.]/g, '');
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // 如果以小数点开始，添加前导零
    if (cleanedValue.startsWith('.')) {
      cleanedValue = '0' + cleanedValue;
    }

    // 限制小数位数
    if (parts.length === 2 && parts[1].length > fromToken?.decimals) {
      cleanedValue = parts[0] + '.' + parts[1].slice(0, fromToken?.decimals);
    }

    // 检查金额是否超过最大限制 (1000 SOL)
    const numValue = parseFloat(cleanedValue || '0');
    if (numValue > 1000) {
      showTransactionMessage('error', '输入金额不能超过1000 SOL');
      return;
    }

    console.log('金额输入处理:', {
      代币: fromToken?.symbol,
      代币精度: fromToken?.decimals,
      原始输入: value,
      处理后金额: cleanedValue,
      数值: numValue
    });

    setAmount(cleanedValue);
  };

  const getQuoteAndFees = async () => {
    try {
      if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
        console.log('获取报价 - 参数无效:', { fromToken, toToken, amount });
        return;
      }

      setIsQuoteLoading(true);
      console.log('==================== 开始获取兑换报价 ====================');
      
      // 获取设备ID
      const deviceId = await DeviceManager.getDeviceId();
      
      console.log('发送API请求参数:', {
        钱包ID: selectedWallet.id,
        设备ID: deviceId,
        输入金额: amount,
        输入代币: fromToken.symbol,
        输出代币: toToken.symbol,
        滑点: slippage
      });

      // 修正参数结构
      const params = {
        device_id: deviceId,
        from_token: fromToken.token_address,
        to_token: toToken.token_address,
        amount: amount,
        slippage: slippage
      };

      console.log('API请求参数:', params);
      
      const response = await api.getSwapQuote(selectedWallet.id, params);

      if (response.status === 'success') {
        const { data } = response;
        
        // 添加详细日志
        console.log('API原始响应数据:', JSON.stringify(response.data, null, 2));
        console.log('解析后的报价数据:', {
          输入代币: {
            地址: data.from_token.address,
            原始数量: data.from_token.amount,
          },
          输出代币: {
            地址: data.to_token.address,
            原始数量: data.to_token.amount,
          },
          最低获得: data.minimum_received
        });
        
        setQuote(data);
        
        // 只有在成功获取报价后，且所有必要参数都存在时，才获取网络费用
        if (selectedWallet && fromToken && toToken && amount && parseFloat(amount) > 0) {
          try {
            console.log('开始获取网络费用');
            const feesResponse = await api.getSolanaSwapEstimateFees(
              selectedWallet.id,
              fromToken.token_address,
              toToken.token_address,
              amount
            );
            
            console.log('网络费用响应:', feesResponse);
            
            if (feesResponse.status === 'success' && feesResponse.data) {
              console.log('设置网络费用:', feesResponse.data);
              
              // 更新报价对象，添加网络费用
              const networkFee = feesResponse.data.networkFee || feesResponse.data.amount || '0.000001';
              setQuote(prev => ({
                ...prev,
                network_fee: networkFee
              }));
              
              setFees(networkFee);
            } else {
              console.log('网络费用响应无效:', feesResponse);
              setFees('0.000001');
            }
          } catch (feeError) {
            console.error('获取网络费用失败:', feeError);
            setFees('0.000001');
          }
        } else {
          console.log('跳过费用请求 - 参数不完整:', { 
            wallet: selectedWallet?.id, 
            fromToken: fromToken?.token_address, 
            toToken: toToken?.token_address, 
            amount 
          });
        }
      }
    } catch (error) {
      console.error('获取报价出错:', error);
      showTransactionMessage('error', error.message || '获取报价失败，请重试');
    } finally {
      setIsQuoteLoading(false);
    }
  };

  const handleSwapTokens = async () => {
    if (!fromToken || !toToken) return;

    try {
      // 保存当前选中的代币地址
      const fromTokenAddress = fromToken?.token_address || fromToken?.address;
      const toTokenAddress = toToken?.token_address || toToken?.address;
      
      // 重新加载用户代币列表和交换代币列表以获取最新余额
      await Promise.all([
        loadUserTokens(),
        loadSwapTokens()
      ]);
      
      console.log('切换代币 - 加载完成:', {
        userTokens: userTokens.length,
        swapTokens: swapTokens.length
      });
      
      // 从最新加载的列表中查找代币
      let newFromToken = swapTokens.find(t => 
        (t.token_address === toTokenAddress) || (t.address === toTokenAddress)
      );
      let newToToken = swapTokens.find(t => 
        (t.token_address === fromTokenAddress) || (t.address === fromTokenAddress)
      );

      // 如果在swapTokens中找不到，尝试在userTokens中查找
      if (!newFromToken) {
        newFromToken = userTokens.find(t => 
          (t.token_address === toTokenAddress) || (t.address === toTokenAddress)
        );
      }
      
      if (!newToToken) {
        newToToken = userTokens.find(t => 
          (t.token_address === fromTokenAddress) || (t.address === fromTokenAddress)
        );
      }

      console.log('切换代币 - 找到代币:', {
        原from代币: fromToken.symbol,
        原to代币: toToken.symbol,
        新from代币: newFromToken?.symbol,
        新to代币: newToToken?.symbol
      });

      // 确保找到了代币
      if (!newFromToken) {
        console.log('未找到新的fromToken，使用默认值:', toToken);
        newFromToken = {...toToken, balance_formatted: '0'};
      }
      
      if (!newToToken) {
        console.log('未找到新的toToken，使用默认值:', fromToken);
        newToToken = {...fromToken, balance_formatted: '0'};
      }

      // 确保新的fromToken有余额信息
      if (!newFromToken.balance_formatted) {
        // 尝试从userTokens中查找相同代币以获取余额
        const fromTokenWithBalance = userTokens.find(t => 
          (t.token_address === newFromToken.token_address) || 
          (t.address === newFromToken.token_address) ||
          (t.symbol === newFromToken.symbol)
        );
        
        if (fromTokenWithBalance && fromTokenWithBalance.balance_formatted) {
          newFromToken.balance_formatted = fromTokenWithBalance.balance_formatted;
          console.log('从用户代币列表中获取余额:', {
            代币: newFromToken.symbol,
            余额: newFromToken.balance_formatted
          });
        } else {
          // 如果仍然没有余额信息，设置为0
          newFromToken.balance_formatted = '0';
          console.log('无法找到余额信息，设置为0:', newFromToken.symbol);
        }
      }
      
      // 确保新的toToken有余额信息
      if (!newToToken.balance_formatted) {
        // 尝试从userTokens中查找相同代币以获取余额
        const toTokenWithBalance = userTokens.find(t => 
          (t.token_address === newToToken.token_address) || 
          (t.address === newToToken.token_address) ||
          (t.symbol === newToToken.symbol)
        );
        
        if (toTokenWithBalance && toTokenWithBalance.balance_formatted) {
          newToToken.balance_formatted = toTokenWithBalance.balance_formatted;
          console.log('从用户代币列表中获取余额:', {
            代币: newToToken.symbol,
            余额: newToToken.balance_formatted
          });
        } else {
          // 如果仍然没有余额信息，设置为0
          newToToken.balance_formatted = '0';
          console.log('无法找到余额信息，设置为0:', newToToken.symbol);
        }
      }
      
      // 确保代币对象有所有必要的字段
      newFromToken = {
        ...newFromToken,
        token_address: newFromToken.token_address || newFromToken.address,
        balance_formatted: newFromToken.balance_formatted || '0'
      };
      
      newToToken = {
        ...newToToken,
        token_address: newToToken.token_address || newToToken.address,
        balance_formatted: newToToken.balance_formatted || '0'
      };
      
      console.log('最终切换后的代币:', {
        fromToken: {
          symbol: newFromToken.symbol,
          address: newFromToken.token_address,
          balance: newFromToken.balance_formatted
        },
        toToken: {
          symbol: newToToken.symbol,
          address: newToToken.token_address,
          balance: newToToken.balance_formatted
        }
      });
      
      setFromToken(newFromToken);
      setToToken(newToToken);
      setAmount('');
      setQuote(null);
      setFees(null);
    } catch (error) {
      console.error('切换代币失败:', error);
      Alert.alert('提示', '切换代币失败，请重试');
    }
  };

  // 替换为新的简化版本，添加旋转动画
  const handleSwapTokensSimple = () => {
    if (!fromToken || !toToken || isSwapping) return;

    try {
      console.log('开始切换代币:', {
        从: fromToken.symbol,
        到: toToken.symbol
      });
      
      // 设置切换状态为true
      setIsSwapping(true);
      
      // 开始旋转动画
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.linear
      }).start();
      
      // 延迟执行切换操作，模拟加载过程
      setTimeout(() => {
        // 直接交换代币对象，保留所有属性
        const tempToken = { ...fromToken };
        setFromToken({ ...toToken });
        setToToken({ ...tempToken });
        
        // 清空输入金额和报价
        setAmount('');
        setQuote(null);
        setFees(null);
        
        // 重置旋转动画
        spinAnim.setValue(0);
        
        // 设置切换状态为false
        setIsSwapping(false);
        
        console.log('代币切换完成');
      }, 600);
    } catch (error) {
      console.error('切换代币失败:', error);
      // 重置旋转动画和切换状态
      spinAnim.setValue(0);
      setIsSwapping(false);
      Alert.alert('提示', '切换代币失败，请重试');
    }
  };

  const handleSwap = async (paymentPassword) => {
    if (!fromToken || !toToken || !amount || !quote || !selectedWallet) {
      Alert.alert('错误', '请确保所有交易信息已填写完整');
      return;
    }

    try {
      setIsLoading(true);
      setTransactionStatus('loading');
      setTransactionError('');
      
      // 获取设备ID
      const deviceId = await DeviceManager.getDeviceId();
      
      // 使用报价中的链上金额，而不是重新计算
      const rawAmount = quote.from_token.amount;
      
      // 构建API请求参数
      const swapParams = {
        device_id: deviceId,
        from_token: fromToken.token_address,
        to_token: toToken.token_address,
        amount: rawAmount,  // 使用报价中的链上金额
        slippage: slippage,
        quote_id: quote.quote_id,
        payment_password: paymentPassword
      };

      console.log('执行兑换交易:', {
        ...swapParams,
        payment_password: '******',  // 隐藏密码
        原始金额: amount,
        链上金额: rawAmount
      });
      
      // 执行兑换
      const response = await api.executeSolanaSwap(selectedWallet.id, swapParams);
      
      if (response?.status === 'success') {
        setTransactionStatus('success');
        // 重置状态
        setAmount('');
        setQuote(null);
        setFees(null);
        // 刷新余额
        loadUserTokens();
      } else {
        setTransactionStatus('failed');
        setTransactionError(response?.message || '交易失败');
      }
    } catch (error) {
      logger.error('执行兑换出错:', error);
      setTransactionStatus('failed');
      setTransactionError(error.message || '交易执行失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlippageChange = (newSlippage) => {
    console.log('滑点设置已更改:', newSlippage);
    setSlippage(newSlippage);
    // 如果有金额输入，重新获取报价
    if (amount && parseFloat(amount) > 0) {
      debouncedGetQuote();
    }
  };

  // 2. 修改 handleTokenSelect 函数
  const handleTokenSelect = (type) => {
    console.log('【Token Select】开始选择代币:', {
      type,
      currentFromToken: fromToken?.symbol,
      currentToToken: toToken?.symbol
    });

    // 先导航到选择页面
    navigation.navigate('TokenSelect', {
      tokens: type === 'from' ? userTokens : swapTokens,
      type,
      // 添加 onFocus 回调，在页面获得焦点时刷新数据
      onFocus: async () => {
        if (type === 'from') {
          console.log('【Token Select】页面获得焦点，开始刷新余额');
          const deviceId = await DeviceManager.getDeviceId();
          
          try {
            console.log('【Token Select】调用 API 获取代币列表');
            const response = await api.getTokensManagement(selectedWallet.id, deviceId, 'solana');
            console.log('【Token Select】API 响应:', response);

            if (response.status === 'success' && response.data?.data?.tokens) {
              const tokens = response.data.data.tokens.map(token => ({
                ...token,
                token_address: token.address,
                balance_formatted: token.balance_formatted || '0'
              }));
              console.log('【Token Select】更新代币列表:', tokens.length);
              setUserTokens(tokens);
            }
          } catch (error) {
            console.error('【Token Select】刷新余额失败:', error);
          }
        } else {
          console.log('【Token Select】选择接收代币，不刷新余额');
        }
      },
      onSelect: async (selectedToken) => {
        console.log('【Token Select】选择了代币:', {
          symbol: selectedToken.symbol,
          address: selectedToken.token_address || selectedToken.address
        });

        // 验证代币数据的完整性
        if (!selectedToken.decimals && selectedToken.decimals !== 0) {
          console.error('【Token Select】选择的代币缺少精度信息:', selectedToken);
          Alert.alert('Error', 'Incomplete token data, please select another token');
          return;
        }

        // 确保代币地址存在
        const tokenAddress = selectedToken.token_address || selectedToken.address;
        if (!tokenAddress) {
          console.error('【Token Select】选择的代币缺少地址:', selectedToken);
          Alert.alert('Error', 'Incomplete token data, please select another token');
          return;
        }

        // 获取最新的余额信息（只对支付代币）
        if (type === 'from') {
          const updatedTokens = userTokens;
          console.log('【Token Select】当前用户代币列表:', updatedTokens.length);
          
          const tokenWithBalance = updatedTokens.find(t => 
            t.address === tokenAddress || 
            t.token_address === tokenAddress
          );
          console.log('【Token Select】找到的代币余额信息:', tokenWithBalance?.balance_formatted);

          // 创建规范化的代币对象
          const normalizedToken = {
            ...selectedToken,
            token_address: tokenAddress,
            balance_formatted: tokenWithBalance?.balance_formatted || '0'
          };
          
          console.log('【Token Select】设置支付代币:', normalizedToken);
          setFromToken(normalizedToken);
          setAmount('');
          setQuote(null);
          setFees(null);
        } else {
          // 接收代币直接设置，不需要余额信息
          const normalizedToken = {
            ...selectedToken,
            token_address: tokenAddress
          };
          console.log('【Token Select】设置接收代币:', normalizedToken);
          setToToken(normalizedToken);
        }
      }
    });
  };

  const calculateExchangeRate = (quote, fromToken, toToken) => {
    if (!quote?.from_token?.amount || !quote?.to_token?.amount || !fromToken?.decimals || !toToken?.decimals) {
      return '计算中...';
    }

    try {
      const fromAmount = new BigNumber(quote.from_token.amount);
      const toAmount = new BigNumber(quote.to_token.amount);
      
      // 考虑代币精度
      const fromDecimals = new BigNumber(10).pow(fromToken.decimals);
      const toDecimals = new BigNumber(10).pow(toToken.decimals);
      
      // 计算实际金额
      const actualFromAmount = fromAmount.dividedBy(fromDecimals);
      const actualToAmount = toAmount.dividedBy(toDecimals);
      
      // 计算兑换率
      const rate = actualToAmount.dividedBy(actualFromAmount);
      
      console.log('兑换率计算:', {
        输入金额: actualFromAmount.toString(),
        输出金额: actualToAmount.toString(),
        兑换率: rate.toString()
      });
      
      // 格式化显示
      return `1 ${fromToken.symbol} = ${rate.toFormat(6)} ${toToken.symbol}`;
    } catch (error) {
      console.error('兑换率计算错误:', error);
      return '计算中...';
    }
  };

  const formatPriceImpact = (impact) => {
    try {
      if (!impact) return '0';
      
      // 使用 BigNumber 处理精度问题
      const impactBN = new BigNumber(impact);
      
      // 转换为百分比
      const impactPercent = impactBN.multipliedBy(100);
      
      // 根据大小格式化显示
      if (impactPercent.isLessThan(0.01) && !impactPercent.isZero()) {
        return '< 0.01%';
      } else if (impactPercent.isGreaterThan(10)) {
        return impactPercent.toFixed(1) + '%';
      } else {
        return impactPercent.toFixed(2) + '%';
      }
    } catch (error) {
      console.error('格式化价格影响错误:', error);
      return '0%';
    }
  };

  // 获取背景颜色
  const getBackgroundColor = () => {
    // 固定返回紫色背景
    return '#2C2941';
  };

  const isExchangeRateReasonable = (quote, fromToken, toToken) => {
    if (!quote || !fromToken || !toToken) return true;
    
    try {
      // 计算兑换率
      const fromAmount = quote.from_token?.amount;
      const toAmount = quote.to_token?.amount;
      
      if (!fromAmount || !toAmount) return true;
      
      const fromValue = new BigNumber(fromAmount).dividedBy(new BigNumber(10).pow(fromToken.decimals));
      const toValue = new BigNumber(toAmount).dividedBy(new BigNumber(10).pow(toToken.decimals));
      
      if (fromValue.isZero()) return true;
      
      const rate = toValue.dividedBy(fromValue);
      
      // 检查兑换率是否异常高
      // 这里我们假设正常情况下，任何代币的兑换率不应该超过 1000
      // 这是一个非常宽松的限制，实际应用中可能需要更精细的逻辑
      if (rate.isGreaterThan(1000)) {
        console.warn('检测到异常高的兑换率:', {
          fromToken: fromToken.symbol,
          toToken: toToken.symbol,
          rate: rate.toString()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('验证兑换率错误:', error);
      return true; // 出错时默认认为合理
    }
  };

  const renderTokenSelector = (token, type, label) => (
    <View style={styles.tokenSelectorWrapper}>
      <Text style={styles.sectionTitle}>
        {type === 'from' ? 'Pay' : 'Receive'}
      </Text>
      <TouchableOpacity 
        style={styles.tokenSelector}
        onPress={() => handleTokenSelect(type)}
      >
        {token ? (
          <>
            <Image 
              source={{ uri: token.logo }} 
              style={styles.tokenLogo} 
              defaultSource={require('../../../assets/default-token.png')}
            />
            <View style={styles.tokenInfo}>
              <View style={styles.tokenNameRow}>
                <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                {tokenPrices[token.token_address]?.price && (
                  <Text style={styles.tokenPrice}>
                    ${tokenPrices[token.token_address].price.toFixed(2)}
                  </Text>
                )}
              </View>
              <Text style={styles.tokenBalance}>
                {type === 'from' 
                  ? `Balance: ${token?.balance_formatted || '0'}`
                  : isQuoteLoading 
                    ? <SkeletonLoader width={120} height={16} style={{ marginTop: 2 }} />
                    : quote?.to_token?.amount
                      ? `Expected: ${formatDisplayAmount(quote.to_token.amount, token.decimals)} ${token.symbol}`
                      : ''
                }
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.selectTokenText}>Select {type === 'from' ? 'payment' : 'receive'} token</Text>
        )}
        <Ionicons name="chevron-down" size={20} color="#8E8E8E" />
      </TouchableOpacity>
      {type === 'from' && (
        <>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#8E8E8E"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={handleAmountChange}
            />
          </View>
          {fromToken && (
            <View style={styles.amountButtonsContainer}>
              <TouchableOpacity
                style={styles.amountButton}
                onPress={() => {
                  if (fromToken?.balance_formatted) {
                    try {
                      const balance = parseFloat(fromToken.balance_formatted.replace(/,/g, '')) || 0;
                      const amount = (balance * 0.25).toFixed(fromToken.decimals);
                      console.log('Setting 25% amount:', {
                        balance: balance,
                        calculatedAmount: amount
                      });
                      setAmount(amount);
                    } catch (error) {
                      console.error('计算25%金额错误:', error);
                      setAmount('0');
                    }
                  }
                }}
              >
                <Text style={styles.amountButtonText}>25%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.amountButton}
                onPress={() => {
                  if (fromToken?.balance_formatted) {
                    try {
                      const balance = parseFloat(fromToken.balance_formatted.replace(/,/g, '')) || 0;
                      const amount = (balance * 0.5).toFixed(fromToken.decimals);
                      console.log('Setting 50% amount:', {
                        balance: balance,
                        calculatedAmount: amount
                      });
                      setAmount(amount);
                    } catch (error) {
                      console.error('计算50%金额错误:', error);
                      setAmount('0');
                    }
                  }
                }}
              >
                <Text style={styles.amountButtonText}>50%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.amountButton}
                onPress={() => {
                  if (fromToken?.balance_formatted) {
                    try {
                      const maxAmount = fromToken.balance_formatted.replace(/,/g, '') || '0';
                      console.log('Setting maximum amount:', maxAmount);
                      setAmount(maxAmount);
                    } catch (error) {
                      console.error('设置最大金额错误:', error);
                      setAmount('0');
                    }
                  }
                }}
              >
                <Text style={styles.amountButtonText}>Max</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderSwapButton = () => {
    const isRateReasonable = isExchangeRateReasonable(quote, fromToken, toToken);
    // 修改禁用条件，添加isQuoteLoading检查
    const isDisabled = !fromToken || !toToken || !amount || isLoading || isInsufficientBalance || isQuoteLoading || !quote;
    
    const handleSwapPress = async () => {
      if (!fromToken || !toToken || !amount || !quote || !selectedWallet) {
        Alert.alert('Error', 'Please ensure all transaction information is complete');
        return;
      }

      try {
        // 获取设备ID
        const deviceId = await DeviceManager.getDeviceId();
        
        // 准备兑换数据，添加更多必要字段
        const swapData = {
          deviceId,
          walletId: selectedWallet.id,
          quote_id: quote.quote_id,
          from_token: fromToken.token_address,
          to_token: toToken.token_address,
          amount: amount,
          slippage: slippage,
          fromSymbol: fromToken.symbol,
          toSymbol: toToken.symbol,
          chain: selectedWallet.chain || 'SOL',
          is_native: fromToken.is_native || fromToken.symbol === 'SOL',
          from_decimals: fromToken.decimals,
          to_decimals: toToken.decimals,
          expected_amount: quote.to_token.amount,
          minimum_received: quote.minimum_received,
          price_impact: quote.price_impact,
          network_fee: quote.network_fee
        };

        console.log('Swap transaction data:', {
          ...swapData,
          deviceId: '***', // 隐藏敏感信息
        });

        // 跳转到支付密码验证页面
        navigation.navigate('PaymentPassword', {
          title: 'Enter Payment Password',
          purpose: 'swap',
          swapData,
          onSwapSuccess: async () => {
            try {
              // 重置状态并刷新余额
              setAmount('');
              setQuote(null);
              setFees(null);
              await loadUserTokens();
            } catch (error) {
              console.error('Error handling swap success:', error);
            }
          }
        });
      } catch (error) {
        console.error('Error preparing swap transaction:', error);
        Alert.alert('Error', 'Failed to prepare swap transaction');
      }
    };

    // 根据加载状态显示不同的按钮文本
    const getButtonText = () => {
      if (isInsufficientBalance) {
        return 'Insufficient Balance';
      }
      if (isQuoteLoading) {
        return 'Loading Quote...';
      }
      if (!quote && amount) {
        return 'Waiting for Quote';
      }
      return 'Swap';
    };

    return (
      <View style={styles.swapButtonContainer}>
        {quote && !isRateReasonable && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              Warning: Current exchange rate is abnormal, please proceed with caution
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.swapButton,
            isDisabled && styles.swapButtonDisabled
          ]}
          onPress={handleSwapPress}
          disabled={isDisabled}
        >
          <LinearGradient
            colors={['#1FC595', '#17A982']}
            style={styles.swapButtonGradient}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingText}>{loadingText}</Text>
              </View>
            ) : isQuoteLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.loadingText}>Loading Quote...</Text>
              </View>
            ) : (
              <Text style={styles.swapButtonText}>
                {getButtonText()}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTransactionModal = () => {
    return (
      <Modal
        visible={transactionStatus !== 'idle'}
        transparent
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {transactionStatus === 'loading' && (
              <>
                <ActivityIndicator size="large" color="#1FC595" />
                <Text style={styles.modalText}>Processing transaction...</Text>
                <Text style={styles.modalSubText}>
                  Converting {currentTransaction?.amount} {currentTransaction?.fromSymbol} 
                  to {currentTransaction?.toSymbol}
                </Text>
                <Text style={styles.modalTips}>
                  Transaction confirmation may take a few seconds, please be patient
                </Text>
              </>
            )}
            {transactionStatus === 'success' && (
              <>
                <Ionicons name="checkmark-circle" size={50} color="#1FC595" />
                <Text style={styles.modalTitle}>Transaction Successful</Text>
                <Text style={styles.modalText}>
                  Successfully converted {currentTransaction?.amount} {currentTransaction?.fromSymbol} 
                  to {currentTransaction?.toSymbol}
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setTransactionStatus('idle');
                    setCurrentTransaction(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
              </>
            )}
            {transactionStatus === 'failed' && (
              <>
                <Ionicons name="close-circle" size={50} color="#FF3B30" />
                <Text style={styles.modalTitle}>Transaction Failed</Text>
                <Text style={styles.modalText}>{transactionError}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setTransactionStatus('idle');
                    setCurrentTransaction(null);
                    setTransactionError('');
                  }}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // 修改消息提示组件，添加不同类型的样式
  const MessageBar = ({ type, message }) => {
    const getBackgroundColor = () => {
      switch (type) {
        case 'success':
          return '#4CAF50';
        case 'error':
          return '#F44336';
        case 'info':
          return '#2196F3';
        default:
          return '#2196F3';
      }
    };

    // 添加动画效果
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(-50));

    useEffect(() => {
      // 并行执行淡入和滑动动画
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    return (
      <Animated.View 
        style={[
          styles.messageBar, 
          { 
            backgroundColor: getBackgroundColor(),
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.messageText}>{message}</Text>
      </Animated.View>
    );
  };

  // 删除或修改getEstimatedFees函数，因为我们现在只在getQuoteAndFees中请求费用
  const getEstimatedFees = async () => {
    console.log('此函数已不再单独使用，费用请求已集成到getQuoteAndFees中');
    // 保留函数但不执行任何操作，以防其他地方有调用
  };

  // 修改useEffect钩子，移除组件挂载时的费用请求
  useEffect(() => {
    // 移除在组件挂载时自动请求费用的逻辑
    // 空函数体，不执行任何操作
  }, []); // 仅在组件挂载时执行一次，但不做任何操作

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2C2941', '#171C32']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* 添加交易状态栏 */}
      <TransactionStatusBar 
        status={transactionStatus}
        message={
          transactionStatus === 'loading' ? '交易确认中...' :
          transactionStatus === 'success' ? '交易已确认' :
          transactionError || '交易失败'
        }
      />

      <View style={[
        styles.safeArea,
        { paddingTop: Platform.OS === 'android' ? insets.top : 0 }
      ]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.walletSelector}
            onPress={() => navigation.navigate('WalletSelector')}
          >
            <Image 
              source={{ uri: selectedWallet?.avatar }} 
              style={styles.walletAvatar} 
            />
            <Text style={styles.walletName}>{selectedWallet?.name}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E8E" />
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.slippageButton}
              onPress={() => {
                console.log('滑点按钮被点击');
                console.log('当前滑点模态框状态:', isSlippageModalVisible);
                setIsSlippageModalVisible(true);
                console.log('设置后滑点模态框状态:', true);
              }}
            >
              <Text style={styles.slippageText}>{slippage}%</Text>
              <Ionicons name="options-outline" size={16} color="#8E8E8E" style={styles.slippageIcon} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainContent}>
          <ScrollView 
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#1FC595"
                colors={['#1FC595']}
              />
            }
          >
            <View style={styles.swapCardContainer}>
                {renderTokenSelector(fromToken, 'from', 'Payment Token')}
              
                {renderTokenSelector(toToken, 'to', 'Receive Token')}
              

              <TouchableOpacity 
                style={[
                  styles.switchButton,
                  {
                    borderColor: '#171C32',
                    backgroundColor: '#1FC595',
                    borderWidth: 3
                  }
                ]}
                onPress={handleSwapTokensSimple}
                disabled={isSwapping}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: spinAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}
                >
                  {isSwapping ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="repeat" size={24} color="#FFFFFF" />
                  )}
                </Animated.View>
              </TouchableOpacity>
            </View>
                
            {/* 只在有报价数据或正在加载报价时显示详情容器 */}
            {(quote || isQuoteLoading) && (
              <View style={[styles.swapCard, styles.detailsCard]}>
                <QuoteDetails 
                  quote={quote}
                  fees={fees}
                  toToken={toToken}
                  fromToken={fromToken}
                  isQuoteLoading={isQuoteLoading}
                  calculateExchangeRate={calculateExchangeRate}
                  formatTokenAmount={formatTokenAmount}
                  formatPriceImpact={formatPriceImpact}
                  tokenPrices={tokenPrices}
                />
              </View>
            )}
          </ScrollView>
          
          <View style={styles.bottomContainer}>
            {renderSwapButton()}
          </View>
        </View>
      </View>

      <SlippageSettingModal
        visible={isSlippageModalVisible}
        onClose={() => setIsSlippageModalVisible(false)}
        currentSlippage={slippage}
        onConfirm={handleSlippageChange}
      />
      {renderTransactionModal()}

      {/* 顶部消息提示 */}
      {showMessage && (
        <MessageBar type={messageType} message={messageText} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
  },
  walletSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  walletName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slippageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  slippageText: {
    color: '#1FC595',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  slippageIcon: {
    marginLeft: 2,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    marginBottom: 100, // 增加底部边距，从80改为100，为底部按钮留出更多空间
  },
  swapCardContainer: {
    position: 'relative',
    paddingTop: 20,
    marginHorizontal: 16,
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 30, // 增加底部边距，让详情容器与底部有更多空间
  },
  tokenSelectorWrapper: {
    padding: 16,
    backgroundColor: 'rgba(31, 197, 149, 0.08)', // 使用主题色的超淡版本作为背景
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(31, 197, 149, 0.1)', // 使用主题色作为边框
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)', // 深色背景
    borderWidth: 1,
    borderColor: 'rgba(31, 197, 149, 0.15)', // 主题色边框
    shadowColor: '#1FC595',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  ,
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(30, 32, 60, 0.8)',
  },
  tokenLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenSymbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenPrice: {
    color: '#8E8E8E',
    fontSize: 14,
    fontWeight: '500',
  },
  tokenBalance: {
    color: '#8E8E8E',
    fontSize: 12,
  },
  selectTokenText: {
    color: '#8E8E8E',
    fontSize: 16,
  },
  amountInputContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    width: '100%',
  },
  amountInput: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '500',
    textAlign: 'right',
    width: '100%',
    padding: 0,
  },
  amountButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  amountButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    minWidth: 60,
    alignItems: 'center',
  },
  amountButtonText: {
    color: '#1FC595',
    fontSize: 12,
    fontWeight: '600',
  },
  switchButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: 40,
    height: 40,
    backgroundColor: '#1FC595',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    marginTop: 46,
    left: '50%',
    marginLeft: -20,
    zIndex: 1,
  },
  detailsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    position: 'relative',
    zIndex: 1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 8,
  },
  detailLabel: {
    color: '#8E8E8E',
    fontSize: 14,
    flex: 1,
  },
  detailValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
    minHeight: 24,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400', // 从'500'改为'400'，去掉加粗效果
    textAlign: 'right',
    marginRight: 4,
    minHeight: 20,
    lineHeight: 20,
  },
  detailValueWarning: {
    color: '#FF9500',
  },
  detailUnit: {
    color: '#8E8E8E',
    fontSize: 13,
    minWidth: 35,
    textAlign: 'right',
    minHeight: 16,
    lineHeight: 16,
  },
  detailUnitWrapper: {
    minWidth: 35,
    alignItems: 'flex-end',
  },
  quoteLoader: {
    marginLeft: 8,
  },
  swapButtonContainer: {
    position: 'relative',
  },
  warningContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    borderRadius: 16,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  swapButton: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  swapButtonGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  swapButtonDisabled: {
    opacity: 0.5,
  },
  swapButtonWarning: {
    backgroundColor: '#FF9500',
  },
  swapButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  slippageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2338',
    padding: 8,
    borderRadius: 8,
  },
  multilineValueContainer: {
    alignItems: 'flex-end',
  },
  multilineValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  tokenSymbolText: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  sectionTitle: {
    color: '#8E8E8E',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#171C32',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  detailsInner: {
    padding: 8,
  },
  detailSkeleton: {
    marginRight: 4,
  },
  quoteDetailsContainer: {
    padding: 8,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    position: 'relative',
    zIndex: 1,
  },
  quoteLabel: {
    color: '#8E8E8E',
    fontSize: 14,
    flex: 1,
  },
  quoteValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400', // 从'500'改为'400'，去掉加粗效果
    textAlign: 'right',
    marginRight: 4,
    minHeight: 20,
    lineHeight: 20,
  },
  warningText: {
    color: '#FF9500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#171C32',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalSubText: {
    fontSize: 14,
    color: '#8E8E8E',
    marginBottom: 16,
  },
  modalTips: {
    fontSize: 12,
    color: '#8E8E8E',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#1FC595',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 60, // 下移位置，避免被系统状态栏遮挡
    left: 16,
    right: 16,
    padding: 12,
    zIndex: 999,
    borderRadius: 12, // 添加圆角
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBar: {
    backgroundColor: '#4CAF50',
  },
  errorBar: {
    backgroundColor: '#F44336',
  },
  messageText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  transactionStatusBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    left: 16,
    right: 16,
    zIndex: 1000,
    height: 40,
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  statusBarLoader: {
    marginRight: 8,
  },
  statusBarIcon: {
    marginRight: 8,
  },
  transactionStatusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  arrowCircleContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  upArrow: {
    position: 'absolute',
    top: 1,
    left: 3,
  },
  downArrow: {
    position: 'absolute',
    bottom: 1,
    right: 3,
  },
});

export default SwapScreen;
