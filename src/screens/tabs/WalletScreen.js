import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Image,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWallet } from '../../contexts/WalletContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { useWalletNavigation } from '../../hooks/useWalletNavigation';

const WalletScreen = ({ navigation }) => {
  const { selectedWallet, tokens, setTokens, setWallets, setSelectedWallet, getTokensCache, updateTokensCache } = useWallet();
  const [wallets, setWalletsState] = useState([]);
  const [totalBalance, setTotalBalance] = useState('0.00');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [change24h, setChange24h] = useState(0);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [screenKey, setScreenKey] = useState(0);
  const currentRequestRef = useRef(null);
  const currentWalletIdRef = useRef(null);  // 用来跟踪当前钱包ID

  useWalletNavigation(navigation);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedWallet) {
      // 更新当前钱包ID引用
      currentWalletIdRef.current = selectedWallet.id;
      
      // 立即清空数据
      setTokens([]);
      setTotalBalance('0.00');
      setChange24h(0);
      
      console.log('钱包切换，准备加载新数据:', {
        walletId: selectedWallet.id,
        chain: selectedWallet.chain
      });
      
      loadTokens(true);
    }
  }, [selectedWallet?.id]);

  useEffect(() => {
    if (!isLoading && wallets.length === 0) {
      // 增加延迟和二次确认
      const timer = setTimeout(async () => {
        const deviceId = await DeviceManager.getDeviceId();
        const currentWallets = await api.getWallets(deviceId);
        
        if (!currentWallets || currentWallets.length === 0) {
          await DeviceManager.setWalletCreated(false);
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }]
            })
          );
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [wallets.length, isLoading]);

  useEffect(() => {
    // 添加导航监听器
    const unsubscribe = navigation.addListener('focus', () => {
      // 检查缓存
      const { data: cachedData, lastUpdate } = getTokensCache(selectedWallet?.id);
      const cacheAge = Date.now() - lastUpdate;
      const CACHE_TIMEOUT = 30000; // 30秒缓存时间

      // 只有在没有缓存或缓存过期的情况下才重新加载
      if (!cachedData || cacheAge >= CACHE_TIMEOUT) {
        loadTokens(false);  // 使用 false 避免显示加载动画
      }
    });

    // 清理监听器
    return unsubscribe;
  }, [navigation, selectedWallet?.id]);

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }, [])
  );

  useEffect(() => {
    if (change24h !== null) {
      // 移除背景色变化逻辑
      console.log('价格变化:', change24h);
    }
  }, [change24h]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getWallets(deviceId);
      
      const walletsArray = Array.isArray(response) ? response : [];
      setWalletsState(walletsArray);
      setWallets(walletsArray); // Update the global wallet state
      
      if (walletsArray.length > 0) {
        // Check if the selected wallet still exists in the updated wallet list
        const selectedWalletExists = walletsArray.some(wallet => wallet.id === selectedWallet?.id);
        
        if (!selectedWallet || !selectedWalletExists) {
          console.log('Setting initial wallet:', walletsArray[0]);
          await setSelectedWallet(walletsArray[0]);
        }
      } else {
        // No wallets exist, clear the selected wallet
        setSelectedWallet(null);
        setWallets([]); // Update the global wallet state
        setTokens([]);
        setTotalBalance('0.00');
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setWalletsState([]);
      setWallets([]); // Update the global wallet state
      setSelectedWallet(null);
      setTokens([]);
      setTotalBalance('0.00');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTokens = async (showLoading = true) => {
    const requestWalletId = currentWalletIdRef.current;
    
    try {
      // 首先检查缓存
      const { data: cachedData, lastUpdate } = getTokensCache(selectedWallet?.id);
      const cacheAge = Date.now() - lastUpdate;
      const CACHE_TIMEOUT = 30000; // 30秒缓存时间
      
      // 如果有缓存且缓存时间在30秒内，直接使用缓存数据
      if (cachedData && cacheAge < CACHE_TIMEOUT) {
        console.log('使用缓存的代币数据:', {
          walletId: selectedWallet?.id,
          cacheAge: `${cacheAge}ms`
        });
        
        if (requestWalletId === currentWalletIdRef.current) {
          const { tokens: cachedTokens, total_value_usd } = cachedData;
          const visibleTokens = cachedTokens.filter(token => token.is_visible);
          setTokens(visibleTokens);
          setTotalBalance(total_value_usd || '0.00');
          calculateChange24h(visibleTokens);
        }
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      const deviceId = await DeviceManager.getDeviceId();
      if (!selectedWallet) return;

      console.log('开始请求代币数据:', {
        requestWalletId,
        currentWalletId: selectedWallet.id,
        chain: selectedWallet.chain
      });

      const response = await api.getWalletTokens(
        deviceId,
        selectedWallet.id,
        selectedWallet.chain
      );

      // 检查当前钱包ID是否仍然匹配
      if (requestWalletId !== currentWalletIdRef.current) {
        console.log('忽略过期响应:', {
          requestWalletId,
          currentWalletId: currentWalletIdRef.current
        });
        return;
      }

      if (response?.status === 'success' && response?.data?.tokens) {
        const { tokens: newTokens, total_value_usd } = response.data;
        const visibleTokens = newTokens.filter(token => token.is_visible);
        
        console.log('设置新的代币数据:', {
          requestWalletId,
          currentWalletId: currentWalletIdRef.current,
          tokensCount: visibleTokens.length
        });
        
        // 更新缓存
        updateTokensCache(selectedWallet.id, response.data);
        
        // 再次检查钱包ID是否匹配
        if (requestWalletId === currentWalletIdRef.current) {
          setTokens(visibleTokens);
          setTotalBalance(total_value_usd || '0.00');
          calculateChange24h(visibleTokens);
        }
      }
    } catch (error) {
      console.error('加载代币失败:', error);
      // 只有当钱包ID仍然匹配时才清空数据
      if (requestWalletId === currentWalletIdRef.current) {
        setTokens([]);
        setTotalBalance('0.00');
        setChange24h(0);
      }
    } finally {
      if (requestWalletId === currentWalletIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  // 添加新的计算函数
  const calculateChange24h = (tokens) => {
    let totalCurrentValue = 0;
    let total24hAgoValue = 0;
    
    tokens.forEach(token => {
      const currentValue = parseFloat(token.value_usd) || 0;
      const change24h = parseFloat(token.price_change_24h) || 0;
      
      totalCurrentValue += currentValue;
      const value24hAgo = currentValue / (1 + (change24h / 100));
      total24hAgoValue += value24hAgo;
    });
    
    const totalChange24h = totalCurrentValue > 0 ? 
      ((totalCurrentValue - total24hAgoValue) / total24hAgoValue) * 100 : 0;
    
    console.log('计算新的涨跌幅:', {
      walletId: selectedWallet.id,
      change24h: totalChange24h
    });
    
    setChange24h(totalChange24h);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTokens(true).finally(() => {
      setIsRefreshing(false);
    });
  };

  const formatChange = (change) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const [imageError, setImageError] = useState(false);

  const getTokenLogo = (logo, symbol) => {
    if (imageError || !logo) {
      // 如果加载失败或没有logo，返回备用图片URL
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/${item.address}/logo.png`;
    }
    return logo;
  };

  const renderTokenItem = ({ item, index }) => {
    // 格式化代币余额
    const formatTokenBalance = (balance) => {
      if (!balance) return '0';
      
      const num = parseFloat(balance);
      if (isNaN(num)) return '0';

      // 如果数字超过8位，使用科学计数法
      if (num >= 1e8 || num <= -1e8) {
        return num.toExponential(4);
      }

      // 如果数字小于0.0001，使用特殊格式
      if (num < 0.0001 && num > 0) {
        const decimalCount = Math.abs(Math.floor(Math.log10(num))) - 1;
        return `0.(${decimalCount})${num.toFixed(decimalCount + 1).slice(-1)}`;
      }

      // 如果是整数，直接返回
      if (Number.isInteger(num)) {
        return num.toLocaleString();
      }

      // 如果是小数，最多显示4位小数
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
        useGrouping: true
      });
    };

    // 格式化代币价值
    const formatTokenValue = (value) => {
      if (!value || parseFloat(value) === 0) return '$0';
      const num = parseFloat(value);
      if (isNaN(num)) return '$0';

      // 如果价值小于 0.0001，使用特殊格式
      if (num < 0.0001 && num > 0) {
        const decimalCount = Math.abs(Math.floor(Math.log10(num))) - 1;
        return `$0.(${decimalCount})${num.toFixed(decimalCount + 1).slice(-1)}`;
      }
      // 如果价值小于 0.01，显示 8 位小数
      if (num < 0.01) {
        return `$${num.toFixed(8)}`;
      }
      // 如果价值小于 1，显示 4 位小数
      if (num < 1) {
        return `$${num.toFixed(4)}`;
      }
      // 其他情况显示 2 位小数
      return `$${num.toFixed(2)}`;
    };

    // 格式化代币名称
    const formatTokenName = (name) => {
      if (!name) return '';
      return name.length > 10 ? `${name.slice(0, 10)}...` : name;
    };

    // 格式化价格变化
    const formatPriceChange = (change) => {
      if (!change) return '+0.00%';
      const num = parseFloat(change);
      if (isNaN(num)) return '+0.00%';
      const prefix = num >= 0 ? '+' : '';
      return `${prefix}${num.toFixed(2)}%`;
    };

    const priceChange = formatPriceChange(item.price_change_24h);
    const isPositiveChange = priceChange.startsWith('+');

    return (
      <TouchableOpacity 
        style={styles.tokenItemCard}
        onPress={async () => {
          const deviceId = await DeviceManager.getDeviceId();
          navigation.navigate('TokenDetail', {
            walletId: selectedWallet?.id,
            deviceId,
            tokenAddress: item.address,
            symbol: item.symbol,
            chain: selectedWallet?.chain
          });
        }}
      >
        <Image 
          source={item.logo ? { 
            uri: item.logo,
            headers: {
              'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          } : require('../../../assets/default-token.png')} 
          style={styles.tokenLogo}
          onError={(error) => {
            console.log('Token logo load error:', item.symbol, error.nativeEvent);
          }}
        />
        <View style={styles.tokenInfo}>
          <View style={styles.tokenHeader}>
            <Text style={styles.tokenName}>{formatTokenName(item.name)}</Text>
            <Text style={styles.tokenValue}>
              {formatTokenValue(item.value_usd)}
            </Text>
          </View>
          <View style={styles.tokenDetails}>
            <Text style={styles.tokenBalance}>
              {formatTokenBalance(item.balance_formatted)} {item.symbol.length > 6 ? `${item.symbol.slice(0, 6)}...` : item.symbol}
            </Text>
            <Text style={[
              styles.priceChange,
              { color: isPositiveChange ? '#1FC595' : '#FF4B55' }
            ]}>
              {priceChange}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Unable to update data. Using cached data.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => loadTokens()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBalanceCard = () => (
    <View style={styles.balanceCard}>
      <View style={styles.balanceContent}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <View style={styles.balanceRow}>
          {isLoading ? (
            <View style={styles.balanceAmountSkeleton}>
              <View style={styles.skeletonAnimation} />
            </View>
          ) : (
            <>
              <Text style={styles.balanceAmount}>
                ${Number(totalBalance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
              <View style={styles.changeIndicator}>
                <Ionicons 
                  name={change24h >= 0 ? "trending-up" : "trending-down"} 
                  size={18} 
                  color={change24h >= 0 ? "#1FC595" : "#FF4B55"} 
                  style={styles.changeIcon}
                />
                <Text style={[
                  styles.changePercentage,
                  { color: change24h >= 0 ? '#1FC595' : '#FF4B55' }
                ]}>
                  {formatChange(change24h)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const handleReceive = () => {
    // 直接导航到 Receive 页面，不需要先选择钱包
    navigation.navigate('Receive');
  };

  const handleSend = () => {
    // 导航到发送页面
    navigation.navigate('Send', {
      selectedWallet
    });
  };

  const handleTokenVisibilityChanged = () => {
    console.log('Token visibility changed, refreshing wallet data...');
    loadTokens();  // 立即重新加载代币列表
  };

  const handleTokenManagementPress = () => {
    navigation.navigate('TokenManagement', {
      onTokenVisibilityChanged: handleTokenVisibilityChanged  // 传递回调函数
    });
  };

  const handleWalletSelect = () => {
    navigation.navigate('WalletSelector');
  };

  const renderTokenSkeleton = () => {
    return Array(3).fill(0).map((_, index) => (
      <View key={`skeleton-${index}`} style={[styles.tokenItemCard, styles.skeletonCard]}>
        <View style={[styles.tokenLogo, styles.tokenLogoSkeleton]}>
          <View style={styles.skeletonAnimation} />
        </View>
        <View style={styles.tokenInfo}>
          <View style={styles.tokenHeader}>
            <View style={[styles.tokenNameSkeleton, { width: 80 }]}>
              <View style={styles.skeletonAnimation} />
            </View>
            <View style={[styles.tokenValueSkeleton, { width: 60 }]}>
              <View style={styles.skeletonAnimation} />
            </View>
          </View>
          <View style={styles.tokenDetails}>
            <View style={[styles.tokenBalanceSkeleton, { width: 100 }]}>
              <View style={styles.skeletonAnimation} />
            </View>
            <View style={[styles.priceChangeSkeleton, { width: 50 }]}>
              <View style={styles.skeletonAnimation} />
            </View>
          </View>
        </View>
      </View>
    ));
  };

  const renderAssetsSection = () => (
    <View style={styles.assetsSection}>
      {isLoading ? (
        renderTokenSkeleton()
      ) : (
        <FlatList
          data={tokens}
          renderItem={renderTokenItem}
          keyExtractor={item => `${item.chain}_${item.address}`}
          scrollEnabled={false}
          contentContainerStyle={styles.tokenList}
          ItemSeparatorComponent={() => <View style={styles.tokenSeparator} />}
        />
      )}
      <TouchableOpacity 
        style={styles.tokenManageButton}
        onPress={handleTokenManagementPress}
      >
        <Ionicons name="apps-outline" size={20} color="#8E8E8E" style={styles.tokenManageIcon} />
        <Text style={styles.tokenManageText}>Token Manage</Text>
      </TouchableOpacity>
    </View>
  );

  const handleWalletDeleted = async () => {
    console.log('=== Handle Wallet Deleted Start ===');
    try {
      // 先清除当前选中的钱包
      await new Promise(resolve => {
        setSelectedWallet(null);
        setWalletsState([]);
        setTimeout(resolve, 100);
      });
      
      const deviceId = await DeviceManager.getDeviceId();
      console.log('Getting updated wallet list...');
      const response = await api.getWallets(deviceId);
      const walletsArray = Array.isArray(response) ? response : [];
      console.log('Updated wallets array:', walletsArray);
      
      if (walletsArray.length === 0) {
        console.log('No wallets remaining, setting wallet created to false...');
        await DeviceManager.setWalletCreated(false);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }]
          })
        );
      } else {
        // 确保状态更新的顺序正确
        await new Promise(resolve => {
          setWalletsState(walletsArray);
          setTimeout(() => {
            setSelectedWallet(walletsArray[0]);
            resolve();
          }, 100);
        });
      }
      
      console.log('Delete wallet operation completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error after wallet deletion:', error);
      Alert.alert(
        'Error',
        'Failed to update wallet list. Please try again.'
      );
      return { success: false };
    }
  };

  const handleDeleteWallet = () => {
    navigation.navigate('PasswordVerification', {
      screen: 'PasswordInput',
      params: {
        purpose: 'delete_wallet',
        title: 'Delete Wallet',
        walletId: selectedWallet?.id,
        onSuccess: async (password) => {
          try {
            const deviceId = await DeviceManager.getDeviceId();
            const deleteResponse = await api.deleteWallet(deviceId, selectedWallet.id, password);
            if (deleteResponse?.status === 'success') {
              await handleWalletDeleted();
              return { success: true };
            }
            return { success: false };
          } catch (error) {
            console.error('Delete wallet error:', error);
            return { success: false };
          }
        }
      }
    });
  };

  const renderWalletInfo = () => {
    console.log('Rendering wallet info with avatar URL:', selectedWallet?.avatar);
    return (
      <View style={styles.walletInfo}>
        <Image 
          source={{ uri: selectedWallet?.avatar }}
          style={styles.walletAvatar}
          onError={(error) => console.error('Failed to load wallet avatar:', error)}
        />
        <Text style={styles.walletName}>{selectedWallet?.name}</Text>
      </View>
    );
  };

  const renderBackground = () => {
    const backgroundColor = change24h >= 0 
      ? 'rgba(31, 197, 149, 0.1)'  // 绿色
      : 'rgba(255, 75, 85, 0.1)';   // 红色

    return (
      <LinearGradient
        colors={[backgroundColor, '#171C32']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    );
  };

  const renderHeaderBackground = () => {
    const opacity = Math.min(scrollOffset / 100, 1);  // 根据滚动位置计算透明度
    return (
      <View 
        style={[
          styles.headerBackground, 
          { 
            backgroundColor: `rgba(23, 28, 50, ${opacity})`,
            height: Platform.OS === 'ios' ? 90 : 60 + StatusBar.currentHeight, // 包含状态栏高度
          }
        ]} 
      />
    );
  };

  return (
    <View key={screenKey} style={styles.container}>
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.walletSelector}
            onPress={handleWalletSelect}
          >
            <Image 
              source={{ uri: selectedWallet?.avatar }} 
              style={styles.walletAvatar} 
            />
            <Text style={styles.walletName}>{selectedWallet?.name}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E8E" />
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <View style={styles.headerButton}>
              <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          onScroll={event => {
            setScrollOffset(event.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#1FC595"
              colors={["#1FC595"]}
            />
          }
        >
          {renderError()}
          {renderBalanceCard()}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleReceive}
            >
              <LinearGradient
                colors={['#1FC595', '#17A982']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="arrow-down" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.actionButtonText}>Receive</Text>
            </TouchableOpacity>
    
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleSend}
            >
              <LinearGradient
                colors={['#FF4B55', '#E63F48']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
    
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={async () => {
                try {
                  if (!selectedWallet?.id) {
                    Alert.alert('错误', '钱包信息不完整');
                    return;
                  }
                  const deviceId = await DeviceManager.getDeviceId();
                  
                  const params = {
                    deviceId,
                    walletId: selectedWallet.id,
                    chain: selectedWallet.chain?.toLowerCase()
                  };

                  console.log('History params:', params);
                  navigation.navigate('History', params);
                } catch (error) {
                  console.error('Navigation error:', error);
                  Alert.alert('错误', '无法访问交易历史');
                }
              }}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="time" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.actionButtonText}>History</Text>
            </TouchableOpacity>
          </View>
          {renderAssetsSection()}
        </ScrollView>
      </SafeAreaView>
    </View>
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
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    zIndex: 1,
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 0,  // 从 16 改为 6，整体向上移动 10
    paddingBottom: 10,
  },
  balanceCard: {
    marginBottom: 24,
    paddingHorizontal: 16,
    marginTop: 0,  // 添加负的上边距
  },
  balanceContent: {
    height: 160,  // 设置固定高度
    justifyContent: 'flex-start',  // 改为从顶部开始布局
    paddingTop: 20,
  },
  balanceLabel: {
    fontSize: 20,
    color: '#A0AEC0',
    fontWeight: '600',
    letterSpacing: 0.5,
    height: 24,  // 设置固定高度
    lineHeight: 24,  // 设置行高
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',  // 让元素靠左对齐
  },
  balanceAmount: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginRight: 12,
    height: 60,  // 设置固定高度
    lineHeight: 60,  // 设置行高
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',  // 垂直居中对齐
  },
  changeIcon: {
    marginRight: 4,  // 稍微减小图标和文字的间距
  },
  changePercentage: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmountSkeleton: {
    height: 60,  // 匹配 balanceAmount 的高度
    width: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  changeSkeleton: {
    height: 40,  // 匹配 changeIndicator 的高度
    width: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  skeletonAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 30,
    marginTop: -50,  // 保持这个负边距
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5.46,
    elevation: 9,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  assetsSection: {
    flex: 1,
  },
  tokenItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    marginBottom: 1,
  },
  tokenSeparator: {
    height: 6,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tokenDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenBalance: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  tokenList: {
    paddingBottom: 10,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 75, 85, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FF4B55',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  retryButton: {
    backgroundColor: '#FF4B55',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenManagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    height: 32,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,  // 确保在渐变背景之上
  },
  skeletonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tokenLogoSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  tokenNameSkeleton: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tokenValueSkeleton: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tokenBalanceSkeleton: {
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  priceChangeSkeleton: {
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tokenManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  tokenManageIcon: {
    marginRight: 8,
  },
  tokenManageText: {
    color: '#8E8E8E',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WalletScreen;