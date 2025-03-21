import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import Toast, { ToastView } from '../../components/Toast';
import RecommendedTokensList from '../swap/RecommendedTokensList';
import Svg, { Path } from 'react-native-svg';

// 添加TokenLogo组件到SwapScreen.js文件顶部

// 使用代币符号生成颜色代码
const getColorFromSymbol = (symbol) => {
  if (!symbol) return '#1FC595';
  
  // 简单的哈希函数生成颜色
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // 转换为HSL颜色，保持亮度和饱和度适中
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 60%)`;
};

// 创建一个更可靠的TokenLogo组件
const TokenLogo = ({ uri, symbol, style }) => {
  const [hasError, setHasError] = useState(false);
  const backgroundColor = getColorFromSymbol(symbol);
  
  // 如果图片加载失败或者是SVG，显示文字图标
  if (hasError || !uri || uri.toLowerCase().endsWith('.svg')) {
    const initial = symbol ? symbol.charAt(0).toUpperCase() : '?';
    
    return (
      <View style={[style, { 
        backgroundColor, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }]}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: style.width * 0.5,
          fontWeight: 'bold'
        }}>
          {initial}
        </Text>
      </View>
    );
  }

  // 尝试加载图片
  return (
    <Image
      style={style}
      source={{ uri }}
      onError={() => setHasError(true)}
      defaultSource={require('../../../assets/default-token.png')}
    />
  );
};

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

// 修改 calculateExchangeRate 函数，使用原始数值计算
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
    
    // 格式化显示
    const formattedRate = formatLargeNumber(rate.toString());
    return `1 ${fromToken.symbol} = ${formattedRate} ${toToken.symbol}`;
  } catch (error) {
    console.error('兑换率计算错误:', error);
    return '计算中...';
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

  // 修改 getFormattedAmount 函数
  const getFormattedAmount = (amount, decimals) => {
    try {
      if (!amount || !decimals) return '0';
      
      // 先将原始数量转换为实际数量（考虑精度）
      const actualAmount = new BigNumber(amount)
        .dividedBy(new BigNumber(10).pow(decimals))
        .toString();
      
      // 使用 formatLargeNumber 格式化显示
      return formatLargeNumber(actualAmount);
    } catch (error) {
      console.error('格式化金额错误:', error);
      return '0';
    }
  };

  const exchangeRate = calculateExchangeRate(quote, fromToken, toToken);
  const priceImpact = quote.price_impact ? formatPriceImpact(quote.price_impact) : '0%';
  
  // 使用修改后的 getFormattedAmount 函数
  const expectedAmount = getFormattedAmount(quote.to_token?.amount, toToken.decimals);
  const minimumReceived = getFormattedAmount(quote.minimum_received, toToken.decimals);
  
  const isPriceImpactHigh = new BigNumber(quote.price_impact || 0).isGreaterThan(0.05);
  
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
        <Text style={styles.quoteLabel}>Expected</Text>
        <Text style={styles.quoteValue}>
          {expectedAmount} {toToken.symbol}
        </Text>
      </View>
      <View style={styles.quoteRow}>
        <Text style={styles.quoteLabel}>Minimum Received</Text>
        <Text style={styles.quoteValue}>
          {minimumReceived} {toToken.symbol}
        </Text>
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
        <Text style={styles.quoteLabel}>Network Fee</Text>
        <Text style={styles.quoteValue}>
          {networkFeeDisplay === 'Calculating...' ? 'Calculating...' : `${networkFeeDisplay} SOL`}
        </Text>
      </View>
    </View>
  );
};

// 移除或注释掉 TransactionStatusBar 组件
// const TransactionStatusBar = ({ status, message }) => {
//   return null;
// };

// 添加一个轻量级的 Toast 组件
const TransactionToast = ({ status, message, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status) {
      // 显示动画
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      // 如果不是 pending 状态，2秒后自动隐藏
      if (status !== 'pending') {
        const timer = setTimeout(() => {
          hideToast();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [status]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!status) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return '#FFB800';
      case 'success': return '#1FC595';
      case 'failed': return '#FF3B30';
      default: return '#2196F3';
    }
  };

  return (
    <Animated.View 
      style={[
        styles.toast,
        {
          transform: [{ translateY }],
          opacity
        }
      ]}
    >
      <View style={[styles.toastContent, { backgroundColor: getStatusColor() }]}>
        {status === 'pending' ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
        ) : (
          <Ionicons 
            name={
              status === 'success' ? 'checkmark-circle' : 
              status === 'failed' ? 'close-circle' : 
              'information-circle'
            } 
            size={16} 
            color="#FFFFFF" 
            style={{ marginRight: 8 }} 
          />
        )}
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const TransactionNotification = ({ status, message }) => {
  if (!status) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          backgroundColor: '#FFB800',
          icon: 'time-outline'
        };
      case 'success':
        return {
          backgroundColor: '#1FC595',
          icon: 'checkmark-circle'
        };
      case 'failed':
        return {
          backgroundColor: '#FF3B30',
          icon: 'close-circle'
        };
      default:
        return {
          backgroundColor: '#2196F3',
          icon: 'information-circle'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.notificationBar, { backgroundColor: config.backgroundColor }]}>
      {status === 'pending' ? (
        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
      ) : (
        <Ionicons name={config.icon} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
      )}
      <Text style={styles.notificationText}>{message}</Text>
    </View>
  );
};

// 修改曲线边框组件
const CurvedBorder = () => (
  <View style={styles.curvedBorderContainer}>
    <Svg height="40" width="100%" style={styles.curvedBorder}>
      <Path
        d="M 0,40 L 0,0 Q 200,40 400,0 L 400,50 Z"
        fill="#171C32"
        stroke="none"
      />
    </Svg>
  </View>
);

// 添加格式化大数字的函数
const formatLargeNumber = (number) => {
  try {
    const num = parseFloat(number);
    if (isNaN(num)) return '0';
    
    const absNum = Math.abs(num);
    
    if (absNum >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (absNum >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (absNum >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    } else if (absNum < 0.01) {
      return num.toFixed(6);
    } else {
      return num.toFixed(2);
    }
  } catch (error) {
    console.error('格式化大数字错误:', error);
    return '0';
  }
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
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loadingText, setLoadingText] = useState('');
  const [estimatedFees, setEstimatedFees] = useState(null);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const spinAnim = useState(new Animated.Value(0))[0];
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastStatus, setToastStatus] = useState(null);

  // 使用 useRef 而不是 useState 来跟踪定时器和计数器
  const transactionStatusRef = React.useRef('idle');
  const statusCheckTimerRef = React.useRef(null);
  const maxCheckAttemptsRef = React.useRef(0);
  const isPolling = useRef(false);

  // 在组件顶部添加强制刷新状态
  const [forceUpdate, setForceUpdate] = useState(false);

  // 添加价格缓存
  const priceCache = useRef(new Map());

  // 修改代币价格请求
  useEffect(() => {
    // 只在屏幕获得焦点时才请求价格
    if (!isScreenFocused || !fromToken || !toToken || !selectedWallet) return;
    
    const fetchTokenPrices = async () => {
      try {
        // 生成缓存键
        const cacheKey = `${fromToken.token_address},${toToken.token_address}`;
        const cachedData = priceCache.current.get(cacheKey);
        const CACHE_TIMEOUT = 60000; // 1分钟缓存
        
        // 如果缓存存在且未过期，使用缓存数据
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIMEOUT)) {
          console.log('使用缓存的价格数据:', cacheKey);
          setTokenPrices(cachedData.data);
          return;
        }
        
        const deviceId = await DeviceManager.getDeviceId();
        const tokenAddresses = [fromToken.token_address, toToken.token_address];
        
        // 确保使用数字类型的钱包ID
        const numericWalletId = Number(selectedWallet.id);
        
        console.log('获取代币价格:', {
          钱包ID: numericWalletId,
          设备ID: deviceId,
          代币地址: tokenAddresses.join(',')
        });
        
        const response = await api.getSolanaTokenPrices(
          numericWalletId,
          deviceId,
          tokenAddresses
        );
        
        if (response.status === 'success' && response.data?.prices) {
          console.log('代币价格数据:', response.data.prices);
          setTokenPrices(response.data.prices);
          
          // 更新缓存
          priceCache.current.set(cacheKey, {
            data: response.data.prices,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('获取代币价格失败:', error);
      }
    };

    // 立即执行一次
    fetchTokenPrices();
    
    // 设置定时器，每60秒刷新一次价格
    const priceInterval = setInterval(fetchTokenPrices, 60000);
    
    return () => {
      console.log('清除价格请求定时器');
      clearInterval(priceInterval);
    };
  }, [isScreenFocused, fromToken?.token_address, toToken?.token_address, selectedWallet?.id]);

  // 修改防抖处理的报价请求
  const debouncedGetQuote = React.useCallback(
    debounce(async () => {
      if (!isScreenFocused || !fromToken || !toToken || !amount) {
        return;
      }
      await getQuoteAndFees();
    }, 2000), // 增加防抖时间到2秒
    [fromToken?.token_address, toToken?.token_address, amount, isScreenFocused]
  );

  // 修改 useFocusEffect 钩子，确保正确设置 isScreenFocused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Swap 屏幕获得焦点');
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
        stopTransactionStatusCheck();
      };
    }, [])
  );

  // 修改轮询交易状态的函数
  const pollTransactionStatus = async (signature) => {
    // 如果已经在轮询中，直接返回
    if (isPolling.current) {
      console.log('已经在轮询中，跳过新的轮询请求');
      return;
    }
    
    // 设置轮询标志
    isPolling.current = true;
    
    Toast.show('Processing Transaction...', 'pending');
    
    let attempts = 0;
    const maxAttempts = 12; // 从30减少到12
    
    while (attempts < maxAttempts) {
      try {
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.getSolanaSwapStatus(
          selectedWallet.id, 
          signature,
          deviceId
        );
        
        if (response.status === 'success' && response.data) {
          if (response.data.status === 'confirmed') {
            await handleTransactionSuccess(signature);
            isPolling.current = false; // 重置轮询标志
            return;
          } 
          else if (response.data.status === 'failed') {
            handleTransactionFailure();
            isPolling.current = false; // 重置轮询标志
            return;
          }
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // 从2秒增加到5秒
      } catch (error) {
        console.error('Status check failed:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // 从2秒增加到5秒
      }
    }
    
    Toast.show('Transaction Status Check Timeout', 'error');
    isPolling.current = false; // 重置轮询标志
  };

  // 修改开始检查交易状态的函数
  const startTransactionStatusCheck = (signature) => {
    // 如果已经在轮询中，直接返回
    if (isPolling.current) {
      console.log('已经在轮询中，跳过新的轮询请求');
      return;
    }
    
    // 设置轮询标志
    isPolling.current = true;
    
    // 先清除可能存在的旧定时器
    stopTransactionStatusCheck();
    
    console.log('Starting transaction status check:', signature);
    
    // 重置计数器
    maxCheckAttemptsRef.current = 0;
    
    // 设置交易状态为加载中
    transactionStatusRef.current = 'loading';
    
    // 立即检查一次
    checkTransactionStatus(signature);
    
    // 设置新的定时器，每5秒检查一次（从3秒增加到5秒）
    const intervalId = setInterval(() => {
      // 在每次检查前先获取当前状态
      const currentStatus = transactionStatusRef.current;
      
      // 增加计数器
      maxCheckAttemptsRef.current += 1;
      
      // 如果已经达到最大检查次数（6次，约30秒）
      if (maxCheckAttemptsRef.current >= 6) {
        console.log('Maximum check attempts reached, stopping check');
        
        // 如果状态仍然是 loading，设置为未知状态
        if (currentStatus === 'loading') {
          console.log('Transaction status still loading, setting to unknown state');
          transactionStatusRef.current = 'info';
          // 显示信息消息
          showTransactionMessage('info', 'Transaction status query timeout, please check transaction history later');
          stopTransactionStatusCheck();
          // 重置交易相关状态
          resetTransactionState();
        }
        
        // 重置轮询标志
        isPolling.current = false;
        return;
      }
      
      // 如果已经是终态，停止检查
      if (currentStatus === 'success' || currentStatus === 'failed' || currentStatus === 'info') {
        console.log('Transaction already in terminal state, stopping scheduled check:', currentStatus);
        stopTransactionStatusCheck();
        // 重置轮询标志
        isPolling.current = false;
        return;
      }
      
      console.log('Scheduled transaction status check:', signature, 'Current status:', currentStatus, 'Check attempts:', maxCheckAttemptsRef.current);
      checkTransactionStatus(signature);
    }, 5000); // 从3秒增加到5秒
    
    // 保存定时器ID
    statusCheckTimerRef.current = intervalId;
  };

  // 修改停止检查交易状态的函数
  const stopTransactionStatusCheck = () => {
    console.log('Stopping transaction status check');
    if (statusCheckTimerRef.current) {
      clearInterval(statusCheckTimerRef.current);
      statusCheckTimerRef.current = null;
    }
    // 重置轮询标志
    isPolling.current = false;
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      console.log('组件卸载，清理资源');
      stopTransactionStatusCheck();
      transactionStatusRef.current = 'idle';
    };
  }, []);

  // 创建一个 ref 来存储定时器
  const quoteRefreshInterval = React.useRef(null);

  // 处理从支付密码页面返回的交易信息
  useEffect(() => {
    // 检查路由参数，支持嵌套参数结构
    const params = route?.params;
    const transactionInfo = params?.transactionInfo;
    const checkTransactionStatus = params?.checkTransactionStatus;
    
    if (transactionInfo && checkTransactionStatus) {
      console.log('收到交易信息，开始监控状态:', transactionInfo);
      
      // 先停止可能存在的旧状态检查
      stopTransactionStatusCheck();
      
      // 重置交易状态
      transactionStatusRef.current = 'loading';
      setCurrentTransaction(transactionInfo);
      
      // 从交易信息中提取签名
      const signature = transactionInfo.signature?.result || transactionInfo.signature;
      if (!signature) {
        console.error('交易信息中没有有效的签名:', transactionInfo);
        transactionStatusRef.current = 'failed';
        showTransactionMessage('error', '无效的交易签名');
        return;
      }
      
      // 开始检查交易状态
      startTransactionStatusCheck(signature);
      
      // 清除路由参数，防止重复处理
      navigation.setParams({ transactionInfo: null, checkTransactionStatus: false });
    }
  }, [route?.params]);

  // 修改检查交易状态的函数
  const checkTransactionStatus = async (signature) => {
    // 获取当前状态
    const currentStatus = transactionStatusRef.current;
    
    console.log('[Status Check] Starting transaction status check:', {
      signature,
      currentStatus,
      attempts: maxCheckAttemptsRef.current
    });
    
    // 如果已经是终态，直接停止检查
    if (currentStatus === 'success' || currentStatus === 'failed' || currentStatus === 'info') {
      console.log('[Status Check] Transaction already in terminal state:', currentStatus);
      stopTransactionStatusCheck();
      return;
    }
    
    if (!signature || !selectedWallet?.id) {
      console.error('[Status Check] Missing required parameters:', { 
        signature, 
        walletId: selectedWallet?.id 
      });
      transactionStatusRef.current = 'failed';
      showTransactionMessage('error', 'Incomplete transaction information');
      stopTransactionStatusCheck();
        return;
      }

      try {
        const deviceId = await DeviceManager.getDeviceId();
      
      console.log('[Status Check] Querying transaction status:', {
        signature,
        walletId: selectedWallet.id,
        deviceId
      });
      
        const response = await api.getSolanaSwapStatus(
        Number(selectedWallet.id),
          signature,
          deviceId
        );

      console.log('[Status Check] Response received:', response);

      if (response.status === 'error') {
        handleTransactionError(response, signature);
        return;
      }

      // 处理不同的交易状态
      switch (response.data?.status) {
            case 'confirmed':
          console.log('[Status Check] Transaction confirmed');
          await handleTransactionSuccess(signature);
          break;
        case 'failed':
          console.log('[Status Check] Transaction failed');
          handleTransactionFailure();
          break;
        case 'pending':
          console.log('[Status Check] Transaction still pending');
          handleTransactionPending();
          break;
        default:
          console.log('[Status Check] Unknown status:', response.data?.status);
          handleUnknownStatus();
      }
    } catch (error) {
      console.error('[Status Check] Error checking status:', error);
      handleTransactionError({ message: error.message }, signature);
    }
  };

  const handleTransactionSuccess = async (signature) => {
    try {
      await new Promise(r => setTimeout(r, 3000));
      const updated = await updateTokenBalance();
      
      if (updated) {
        Toast.show('Transaction Successful', 'success');
      } else {
        Toast.show('Transaction Successful, Please Refresh Balance', 'success');
      }
    } catch (error) {
      console.error('Transaction success handling failed:', error);
      Toast.show('Transaction Successful, Balance Update Failed', 'success');
    }
  };

  const handleTransactionFailure = () => {
    Toast.show('Transaction Failed', 'error');
  };

  const handleTransactionPending = () => {
    Toast.show('交易处理中...', 'pending');
  };

  const handleUnknownStatus = () => {
    if (maxCheckAttemptsRef.current >= 5) {
      console.log('Status still unknown after multiple checks, setting to unknown state');
      transactionStatusRef.current = 'info';
      showTransactionMessage('info', 'Transaction status unknown, please check transaction history later');
      stopTransactionStatusCheck();
      resetTransactionState();
    }
  };

  const handleTransactionError = (response, signature) => {
    if (response.message && 
        (response.message.includes('InstructionError') || 
         response.message.includes('Transaction failed'))) {
      console.log('Transaction failure error detected:', response.message);
      transactionStatusRef.current = 'failed';
      showTransactionMessage('error', 'Transaction execution failed');
      stopTransactionStatusCheck();
      resetTransactionState();
      return;
    }
    
    if (response.message && response.message.includes('Transaction information is empty')) {
      console.log('Transaction may not be on-chain yet, continuing to wait...');
      return;
    }
    
    if (maxCheckAttemptsRef.current >= 3) {
      console.log('Multiple transaction status query failures');
      transactionStatusRef.current = 'info';
      showTransactionMessage('error', 'Unable to verify transaction status');
      stopTransactionStatusCheck();
      resetTransactionState();
      return;
    }
  };

  // 添加重置交易状态的函数
  const resetTransactionState = useCallback(() => {
    console.log('Resetting transaction-related states');
    setAmount('');
    setQuote(null);
    setFees(null);
    setCurrentTransaction(null);
    
    // 刷新数据
    loadUserTokens();
    loadSwapTokens();
  }, []);

  // 添加新的 useEffect 来获取代币价格
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

  useEffect(() => {
    if (route.params?.pendingTransaction && route.params?.signature) {
      // 设置按钮为加载状态
      setIsLoading(true);
      setLoadingText('交易确认中');
      pollTransactionStatus(route.params.signature);
    }
  }, [route.params]);

  // 添加onRefresh函数
  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      console.log('开始刷新数据');
      
      // 获取最新代币列表
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getTokensManagement(
        selectedWallet.id,
        deviceId,
        'solana'
      );
      
      if (response.status === 'success' && response.data?.data?.tokens) {
        const tokens = response.data.data.tokens;
        
        // 更新代币列表
        const processedTokens = tokens.map(token => ({
          ...token,
          token_address: token.address,
          balance_formatted: token.balance_formatted || '0'
        }));
        
        // 更新userTokens状态
        setUserTokens(processedTokens);
        
        // 更新fromToken余额
        const currentFromAddress = fromToken?.address || fromToken?.token_address;
        const updatedFromToken = processedTokens.find(token => 
          token.address === currentFromAddress || 
          token.token_address === currentFromAddress
        );
        
        if (updatedFromToken) {
          console.log('刷新：更新fromToken余额:', {
            symbol: updatedFromToken.symbol,
            oldBalance: fromToken.balance_formatted,
            newBalance: updatedFromToken.balance_formatted
          });
          
          // 更新fromToken
          setFromToken(prev => ({
            ...prev,
            balance: updatedFromToken.balance,
            balance_formatted: updatedFromToken.balance_formatted
          }));
        }
        
        // 更新toToken余额
        const currentToAddress = toToken?.address || toToken?.token_address;
        const updatedToToken = processedTokens.find(token => 
          token.address === currentToAddress || 
          token.token_address === currentToAddress
        );
        
        if (updatedToToken) {
          console.log('刷新：更新toToken余额:', {
            symbol: updatedToToken.symbol,
            oldBalance: toToken.balance_formatted,
            newBalance: updatedToToken.balance_formatted
          });
          
          // 更新toToken
          setToToken(prev => ({
            ...prev,
            balance: updatedToToken.balance,
            balance_formatted: updatedToToken.balance_formatted
          }));
        }
      }
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedWallet?.id, fromToken?.token_address, toToken?.token_address]);

  // 针对pay token更新问题的简化方案

  // 新增：专门用于更新token余额的函数
  const updateTokenBalance = async () => {
    try {
      console.log('开始更新代币列表和余额');
      
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getTokensManagement(
        selectedWallet.id,
        deviceId,
        'solana'
      );

        if (response.status === 'success' && response.data?.data?.tokens) {
        const tokens = response.data.data.tokens;
        
        // 更新整个代币列表
        const processedTokens = tokens.map(token => ({
            ...token,
          token_address: token.token_address || token.address,
            balance_formatted: token.balance_formatted || '0'
          }));
          
        // 更新 userTokens 状态
        setUserTokens(processedTokens);
        
        // 查找并更新 fromToken
        const updatedFromToken = processedTokens.find(token => 
          token.token_address === fromToken.token_address || 
          token.address === fromToken.token_address
        );
        
        // 查找并更新 toToken
        const updatedToToken = processedTokens.find(token => 
          token.token_address === toToken.token_address || 
          token.address === toToken.token_address
        );
        
        console.log('更新代币状态:', {
          fromToken: updatedFromToken?.symbol,
          fromTokenBalance: updatedFromToken?.balance_formatted,
          toToken: updatedToToken?.symbol,
          toTokenBalance: updatedToToken?.balance_formatted
        });
        
        // 使用完整的新对象更新状态
            if (updatedFromToken) {
          setFromToken(updatedFromToken);
        }
        
        if (updatedToToken) {
          setToToken(updatedToToken);
        }
        
        // 清空相关状态
        setAmount('');
        setQuote(null);
        setFees(null);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新代币列表和余额失败:', error);
      return false;
    }
  };

  // 处理路由参数
  useEffect(() => {
    const params = route.params;
    if (params?.transactionInfo?.signature) {
      console.log('收到新交易签名:', params.transactionInfo.signature);
      pollTransactionStatus(params.transactionInfo.signature);
      navigation.setParams({ transactionInfo: null });
    }
  }, [route.params?.transactionInfo]);

  const showTransactionMessage = (type, text) => {
    console.log('[Message Display] Attempting to show message:', {
      type,
      text,
      currentMessageType: messageType,
      currentMessageText: messageText,
      isCurrentlyShowing: showMessage,
      hasExistingTimer: !!window.messageTimer
    });
    
    // 如果已经显示了相同类型和文本的消息，直接返回
    if (messageType === type && messageText === text && showMessage) {
      console.log('[Message Display] Skipping duplicate message');
      return;
    }
    
    // 如果已经有消息在显示，先清除它
    if (showMessage) {
      console.log('[Message Display] Clearing existing message');
      // 清除可能存在的定时器
      if (window.messageTimer) {
        console.log('[Message Display] Clearing existing timer');
        clearTimeout(window.messageTimer);
        window.messageTimer = null;
      }
    }
    
    console.log('[Message Display] Setting new message');
    
    // 设置新消息
    setMessageType(type);
    setMessageText(text);
    setShowMessage(true);
    
    // 设置新的定时器
    const duration = type === 'error' ? 5000 : 3000;
    console.log(`[Message Display] Setting timer for ${duration}ms`);
    
    window.messageTimer = setTimeout(() => {
      console.log('[Message Display] Timer expired, clearing message');
      setShowMessage(false);
      setMessageType('');
      setMessageText('');
      window.messageTimer = null;
    }, duration);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserTokens();
    setIsRefreshing(false);
  };

  const loadUserTokens = async () => {
    try {
      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();
      
      console.log('加载用户代币列表:', {
        walletId: selectedWallet.id,
        deviceId
      });
      
      const response = await api.getTokensManagement(
        selectedWallet.id,
        deviceId,
        selectedWallet.chain
      );
      
      if (response?.status === 'success' && response.data?.data?.tokens) {
        const visibleTokens = response.data.data.tokens
          .filter(token => token.is_visible)
          .map(token => ({
            ...token,
            token_address: token.token_address || token.address
          }));

        console.log('用户代币列表加载成功:', {
          总数量: response.data.data.tokens.length,
          可见代币: visibleTokens.length,
          代币列表: visibleTokens.map(t => ({
            符号: t.symbol,
            余额: t.balance_formatted,
            精度: t.decimals,
            地址: t.token_address
          }))
        });
        
        // 更新默认代币的余额
        const solToken = visibleTokens.find(t => t.token_address === DEFAULT_TOKENS.SOL.token_address);
        const usdcToken = visibleTokens.find(t => t.token_address === DEFAULT_TOKENS.USDC.token_address);

        if (solToken) {
          setFromToken(prev => ({
            ...prev,
            balance_formatted: solToken.balance_formatted
          }));
        }

        if (usdcToken) {
          setToToken(prev => ({
            ...prev,
            balance_formatted: usdcToken.balance_formatted
          }));
        }

        setUserTokens(visibleTokens);
        }
      } catch (error) {
      console.error('加载用户代币列表失败:', error);
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
    try {
      // 移除所有非数字和小数点的字符
      let cleanValue = value.replace(/[^0-9.]/g, '');
      
      // 只允许一个小数点
      const decimalPoints = cleanValue.match(/\./g);
      if (decimalPoints && decimalPoints.length > 1) {
        cleanValue = cleanValue.substring(0, cleanValue.lastIndexOf('.'));
      }

      // 如果是小数，限制小数位数
      if (cleanValue.includes('.')) {
        const [integer, decimal] = cleanValue.split('.');
        const maxDecimals = fromToken?.decimals || 6;
        cleanValue = `${integer}.${decimal.slice(0, maxDecimals)}`;
      }

      // 移除前导零
      cleanValue = cleanValue.replace(/^0+(?=\d)/, '');
      
      // 如果是空字符串或只有小数点，设置为空
      if (cleanValue === '' || cleanValue === '.') {
        setAmount('');
        setQuote(null);
        setIsInsufficientBalance(false);
        return;
      }

      // 移除末尾的零和小数点
      cleanValue = cleanValue.replace(/\.?0+$/, '');

      // 检查余额
      const inputAmount = parseFloat(cleanValue);
      const balance = parseFloat(fromToken?.balance_formatted?.replace(/,/g, '') || '0');
      
      // 设置金额
      setAmount(cleanValue);

      if (inputAmount > balance) {
        setIsInsufficientBalance(true);
        setQuote(null); // 清空报价
        return; // 余额不足时直接返回，不获取报价
      }

      setIsInsufficientBalance(false);
      
      // 只有当金额大于0且不超过余额时才获取报价
      if (inputAmount > 0) {
        debouncedGetQuote();
      } else {
        setQuote(null);
      }
    } catch (error) {
      console.error('处理金额输入错误:', error);
      setAmount('');
      setQuote(null);
      setIsInsufficientBalance(false);
    }
  };

  const getQuoteAndFees = async () => {
    try {
      if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
        console.log('获取报价 - 参数无效:', { fromToken, toToken, amount });
        return;
      }

      // 在最开始就检查是否是相同代币
      if (fromToken.token_address === toToken.token_address) {
        console.log('检测到相同代币:', {
          fromToken: fromToken.symbol,
          toToken: toToken.symbol,
          address: fromToken.token_address
        });
        Toast.show('Cannot swap same token', 'error');
        setQuote(null);
        setFees(null);
        return;
      }

      setIsQuoteLoading(true);
      console.log('==================== 开始获取兑换报价 ====================');
      
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
      Toast.show(error.message || 'Failed to get quote', 'error');
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
      Alert.alert('Notice', 'Token swap failed, please try again');
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
      Alert.alert('Notice', 'Token swap failed, please try again');
    }
  };

  const handleSwap = async (paymentPassword) => {
    if (!fromToken || !toToken || !amount || !quote || !selectedWallet) {
      Alert.alert('Error', 'Please ensure all transaction information is complete');
      return;
    }

    try {
      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();
      
      const swapParams = {
        device_id: deviceId,
        from_token: fromToken.token_address,
        to_token: toToken.token_address,
        amount: quote.from_token.amount,
        slippage: slippage,
        quote_id: quote.quote_id,
        payment_password: paymentPassword
      };

      const response = await api.executeSolanaSwap(selectedWallet.id, swapParams);
      
      if (response?.status === 'success') {
        // 重置状态
        setAmount('');
        setQuote(null);
        setFees(null);
        // 刷新余额
        loadUserTokens();
      } else {
        Toast.show(response?.message || 'Transaction Failed', 'error');
      }
    } catch (error) {
      console.error('Swap execution failed:', error);
      Toast.show(error.message || 'Transaction Failed, Please Try Again', 'error');
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

  const handleTokenSelect = (type) => {
    // 修改回正确的导航目标
    if (type === 'from') {
      navigation.navigate('PaymentTokenList', {
        selectedToken: fromToken,
        onSelectToken: (token) => {
          console.log('选择支付代币:', token);
          setFromToken(token);
          setAmount('');
          setQuote(null);
          setFees(null);
        }
      });
    } else {
      navigation.navigate('ReceivingTokenList', {  // 改回 ReceivingTokenList
        selectedToken: toToken,
        onSelectToken: (token) => {
          console.log('选择接收代币:', token);
          // 先重置所有状态
          resetSwapState();
          // 设置新的代币
          setToToken(token);
        }
      });
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
                  ? `Balance: ${formatLargeNumber(token?.balance_formatted?.replace(/,/g, '') || '0')}`
                  : isQuoteLoading 
                    ? <SkeletonLoader width={120} height={16} style={{ marginTop: 2 }} />
                    : quote?.to_token?.amount
                      ? (() => {
                          // 直接使用 BigNumber 处理精度转换
                          const actualAmount = new BigNumber(quote.to_token.amount)
                            .dividedBy(new BigNumber(10).pow(token.decimals))
                            .toString();
                          
                          // 使用 formatLargeNumber 格式化显示
                          const formattedAmount = formatLargeNumber(actualAmount);
                          return `Expected: ${formattedAmount} ${token.symbol}`;
                        })()
                      : `Expected: 0 ${token.symbol}`
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
      
      {type === 'to' && (
        <View style={styles.recommendedTokensWrapper}>
          <RecommendedTokensList 
            onSelectToken={async (token) => {
              try {
                // 先重置所有状态（包括金额）
                resetSwapState();
                
                // 等待状态重置
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // 确保代币对象格式完全一致
                const normalizedToken = {
                  ...token,
                  token_address: token.token_address || token.address,
                  address: token.token_address || token.address,
                  decimals: parseInt(token.decimals) || 0,
                  balance_formatted: token.balance_formatted || '0',
                  name: token.name || token.symbol,
                  symbol: token.symbol || '',
                  logo: token.logo || null,
                  is_native: token.is_native || false,
                  price_usd: token.price_usd || '0',
                  value_usd: token.value_usd || '0',
                  price_change_24h: token.price_change_24h || '0'
                };
                
                // 设置新的接收代币
                await setToToken(normalizedToken);
              } catch (error) {
                console.error('选择推荐代币失败:', error);
                Toast.show('Failed to select token', 'error');
              }
            }}
            walletId={selectedWallet?.id}
            chain={selectedWallet?.chain}
            selectedToken={toToken}
          />
        </View>
      )}
    </View>
  );

  const renderSwapButton = () => {
    const isDisabled = !fromToken || !toToken || !amount || isLoading || isInsufficientBalance || isQuoteLoading || !quote;
    
    const handleSwapPress = async () => {
      if (!fromToken || !toToken || !amount || !quote || !selectedWallet) {
        Alert.alert('Error', 'Please ensure all transaction information is complete');
        return;
      }

      try {
        // 获取设备ID
        const deviceId = await DeviceManager.getDeviceId();
        
        // 准备兑换数据
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

    return (
      <View style={styles.swapButtonWrapper}>
        <CurvedBorder />
        <View style={styles.swapButtonContainer}>
          <TouchableOpacity
            style={[
              styles.swapButton,
              isInsufficientBalance && styles.swapButtonWarning,
              isDisabled && styles.swapButtonDisabled
            ]}
            onPress={handleSwapPress}
            disabled={isDisabled}
          >
            <Text style={styles.swapButtonText}>
              {isInsufficientBalance ? 'Insufficient Balance' : isLoading ? 'Processing...' : 'Swap'}
            </Text>
          </TouchableOpacity>
        </View>
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
    // 设置背景颜色
    const getBackgroundColor = () => {
      switch (type) {
        case 'success': return '#4CAF50';
        case 'error': return '#F44336';
        case 'warning': return '#FF9500';
        case 'info': return '#2196F3';
        default: return '#2196F3';
      }
    };

    console.log('【消息条】渲染消息:', { type, message, 显示: true });

    return (
      <View style={[styles.messageBar, { backgroundColor: getBackgroundColor() }]}>
        <Ionicons 
          name={
            type === 'success' ? 'checkmark-circle' :
            type === 'error' ? 'close-circle' :
            type === 'warning' ? 'warning' :
            'information-circle'
          } 
          size={20} 
          color="#FFFFFF" 
          style={{ marginRight: 8 }}
        />
        <Text style={styles.messageText}>{message}</Text>
      </View>
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

  const showTransactionToast = (status, message) => {
    setToastStatus(status);
    setToastMessage(message);
    setShowToast(true);
  };

  // 添加重置状态的函数
  const resetSwapState = useCallback(() => {
    setAmount(''); // 添加清除金额
    setQuote(null);
    setFees(null);
    setIsQuoteLoading(false);
    setIsInsufficientBalance(false);
  }, []);

  // 修改报价刷新机制
  useEffect(() => {
    // 只有在有金额输入且金额不为0时才请求报价
    if (isScreenFocused && amount && amount !== '0' && fromToken && toToken) {
      // 检查是否是相同的代币
      const fromAddress = fromToken?.token_address || fromToken?.address;
      const toAddress = toToken?.token_address || toToken?.address;
      if (fromAddress !== toAddress) {  // 只有不同代币才请求报价
        console.log('金额或滑点变化，请求报价:', { amount, slippage });
        debouncedGetQuote();
      }
    } else {
      // 如果没有输入金额或金额为0，清空报价
      setQuote(null);
      setFees(null);
    }
  }, [amount, slippage, debouncedGetQuote]); // 监听金额、滑点和debouncedGetQuote的变化

  // 确保在组件挂载时加载代币列表
  useEffect(() => {
    if (selectedWallet) {
      loadUserTokens();
      loadSwapTokens();
    }
  }, [selectedWallet]);

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
      
      <View style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
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
                onRefresh={onRefresh}
                tintColor="#1FC595"
                colors={['#1FC595']}
              />
            }
          >
            <View style={styles.swapCardContainer}>
              <View style={styles.swapCard}>
                {renderTokenSelector(fromToken, 'from', 'Payment Token')}
              </View>
              
              <View style={styles.swapCard}>
                {renderTokenSelector(toToken, 'to', 'Receive Token')}
              </View>

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

      {/* 顶部消息提示 */}
      {showMessage && (
        <MessageBar type={messageType} message={messageText} />
      )}

      {/* 使用新的 Toast 提示组件 */}
      <TransactionToast
        status={showToast ? toastStatus : null}
        message={toastMessage}
        onHide={() => {
          setShowToast(false);
          setToastStatus(null);
          setToastMessage('');
        }}
      />
      <ToastView />
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
    // 确保主内容在通知条下方
    marginTop: 0,
  },
  scrollView: {
    flex: 1,
    marginBottom: 90, // 调整底部边距
  },
  swapCardContainer: {
    position: 'relative',
    paddingTop: 12, // 减小顶部间距
    marginHorizontal: 16,
  },
  swapCard: {
    borderRadius: 16,
    padding: 16,
    paddingBottom: 0,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(40, 42, 70, 1)',
    minHeight: 180, // 添加最小高度确保内容稳定
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 16, // 减小底部间距
  },
  tokenSelectorWrapper: {
    width: '100%',
    marginBottom: 12, // 减小底部间距
  },
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
    marginTop: 8, // 减小顶部间距
    marginBottom: 8, // 减小底部间距
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
    marginBottom: 8, // 减小底部间距
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
    top: 220, // 使用固定位置替代百分比
    left: '50%',
    marginLeft: -20,
    zIndex: 2,
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
  swapButtonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#171C32',
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
  swapButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 16,
    backgroundColor: '#171C32',
  },
  swapButton: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapButtonDisabled: {
    backgroundColor: 'rgba(31, 197, 149, 0.3)',
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
    top: Platform.OS === 'ios' ? 50 : 60,
    left: 16,
    right: 16,
    padding: 12,
    zIndex: 999,
    borderRadius: 12,
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
  messageText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
  toast: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    zIndex: 9999,
  },
  
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  notificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    width: '100%',
  },
  
  notificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  recommendedTokensWrapper: {
    width: '100%',
    marginHorizontal: -16, // 抵消父容器的padding
  },

  curvedBorderContainer: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  curvedBorder: {
    position: 'absolute',
    top: 0,
  },
});

export default SwapScreen;