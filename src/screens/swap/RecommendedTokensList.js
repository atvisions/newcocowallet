import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from '../../components/Toast';

const RecommendedTokensList = ({ onSelectToken, walletId, chain, selectedToken }) => {
  const [recommendedTokens, setRecommendedTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [flipAnimation] = useState(new Animated.Value(0));
  const [currentPage, setCurrentPage] = useState(0);
  const [logoErrors, setLogoErrors] = useState({});
  
  // 每页显示的代币数量
  const tokensPerPage = 3;

  const loadRecommendedTokens = async () => {
    try {
      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();
      
      const response = await api.getRecommendedTokens(deviceId, 'SOL', 'solana');
      
      if (response?.status === 'success' && response.data && response.data.length > 0) {
        const allTokens = response.data.map(token => ({
          ...token,
          token_address: convertToProperCase(token.token_address),
          address: convertToProperCase(token.token_address)
        }));
        
        // 过滤掉已选择的代币
        const availableTokens = allTokens.filter(token => 
          token.token_address !== selectedToken?.token_address
        );
        
        let selectedTokens = [];
        
        if (availableTokens.length <= 3) {
          selectedTokens = availableTokens;
        } else {
          // 随机选择3个不重复的代币
          const shuffledTokens = [...availableTokens].sort(() => Math.random() - 0.5);
          selectedTokens = shuffledTokens.slice(0, 3);
        }
        
        setRecommendedTokens(selectedTokens);
        setCurrentPage(0);
        flipCards();
      } else {
        console.log('No tokens found or invalid response');
        setRecommendedTokens([]);
      }
    } catch (error) {
      console.error('Failed to load recommended tokens:', error);
      setRecommendedTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletId) {
      loadRecommendedTokens();
    }
  }, [walletId, chain]);

  // 翻转卡片动画
  const flipCards = () => {
    flipAnimation.setValue(0);
    Animated.timing(flipAnimation, {
      toValue: 1,
      duration: 800,
      easing: Easing.elastic(1),
      useNativeDriver: true
    }).start();
  };

  // 获取当前页的代币
  const getCurrentPageTokens = () => {
    const startIndex = currentPage * tokensPerPage;
    return recommendedTokens.slice(startIndex, startIndex + tokensPerPage);
  };

  // 切换到下一页
  const nextPage = () => {
    const totalPages = Math.ceil(recommendedTokens.length / tokensPerPage);
    const nextPageIndex = (currentPage + 1) % totalPages;
    setCurrentPage(nextPageIndex);
    flipCards();
  };

  // 切换到上一页
  const prevPage = () => {
    const totalPages = Math.ceil(recommendedTokens.length / tokensPerPage);
    const prevPageIndex = (currentPage - 1 + totalPages) % totalPages;
    setCurrentPage(prevPageIndex);
    flipCards();
  };

  // 渲染分页指示器
  const renderPagination = () => {
    const totalPages = Math.ceil(recommendedTokens.length / tokensPerPage);
    
    if (totalPages <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity 
          style={styles.paginationButton}
          onPress={prevPage}
          disabled={totalPages <= 1}
        >
          <Ionicons name="chevron-back" size={20} color="#1FC595" />
        </TouchableOpacity>
        
        <View style={styles.paginationDots}>
          {Array.from({ length: totalPages }).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.paginationDot,
                currentPage === index && styles.paginationDotActive
              ]} 
            />
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.paginationButton}
          onPress={nextPage}
          disabled={totalPages <= 1}
        >
          <Ionicons name="chevron-forward" size={20} color="#1FC595" />
        </TouchableOpacity>
      </View>
    );
  };

  // 添加一个辅助函数来转换地址格式
  const convertToProperCase = (address) => {
    if (!address) return address;
    
    // Solana 地址的正确大小写映射
    const properCaseMap = {
      'epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      '7eynhqor9ym3n7uoakroa44uy8jeazv3qyouov87awms': '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs',
      // 可以添加更多的映射...
    };

    return properCaseMap[address.toLowerCase()] || address;
  };

  const renderRecommendedToken = ({ item, index }) => {
    const delay = index * 100;
    
    const cardFlip = Animated.timing(flipAnimation, {
      toValue: 1,
      duration: 800,
      delay,
      easing: Easing.elastic(1),
      useNativeDriver: true
    });
    
    const flipRotation = flipAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['0deg', '90deg', '0deg']
    });
    
    const scale = flipAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 0.9, 1]
    });

    // 规范化代币数据
    const handleTokenSelect = () => {
      try {
        const normalizedToken = {
          ...item,
          // 使用正确的大小写格式
          token_address: convertToProperCase(item.token_address || item.address),
          address: convertToProperCase(item.token_address || item.address),
          decimals: parseInt(item.decimals) || 0,
          balance_formatted: item.balance_formatted || '0',
          logo: item.logo || 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          name: item.name || item.symbol,
          symbol: item.symbol || '',
          is_native: item.is_native || false,
          price_usd: item.price_usd || '0',
          value_usd: item.value_usd || '0',
          price_change_24h: item.price_change_24h || '0'
        };

        // 验证必要字段
        if (!normalizedToken.token_address) {
          throw new Error('Token address is required');
        }

        if (!normalizedToken.decimals && normalizedToken.decimals !== 0) {
          throw new Error('Token decimals is required');
        }

        console.log('选择推荐代币 - 完整数据:', {
          原始数据: item,
          规范化数据: normalizedToken,
          关键字段: {
            地址: normalizedToken.token_address,
            精度: normalizedToken.decimals,
            符号: normalizedToken.symbol,
            余额: normalizedToken.balance_formatted,
            价格: normalizedToken.price_usd
          }
        });

        // 调用选择回调
        onSelectToken(normalizedToken);
      } catch (error) {
        console.error('处理代币选择错误:', error);
        Toast.show(error.message || 'Invalid token data', 'error');
      }
    };
    
    return (
      <Animated.View
        style={[
          styles.recommendedTokenItem,
          {
            transform: [
              { rotateY: flipRotation },
              { scale: scale }
            ]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.tokenButton}
          onPress={handleTokenSelect}  // 使用新的处理函数
        >
          <LinearGradient
            colors={['rgba(40, 42, 70, 0.8)', 'rgba(30, 32, 60, 0.9)']}
            style={styles.tokenGradient}
          >
            <View style={styles.logoContainer}>
              <Ionicons name="logo-bitcoin" size={36} color="rgba(255, 255, 255, 0.2)" style={styles.backupLogo} />
              <Image 
                source={{ 
                  uri: logoErrors[item.symbol] 
                    ? 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' 
                    : item.logo 
                }} 
                style={styles.recommendedTokenLogo}
                defaultSource={require('../../../assets/default-token.png')}
                onError={() => {
                  setLogoErrors(prev => ({
                    ...prev,
                    [item.symbol]: true
                  }));
                }}
              />
            </View>
            <View style={styles.recommendedTokenInfo}>
              <Text style={styles.recommendedTokenSymbol}>{item.symbol}</Text>
              <Text style={styles.recommendedTokenName} numberOfLines={1} ellipsizeMode="tail">
                {item.name}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Suggestions</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadRecommendedTokens}
        >
          <Ionicons name="refresh" size={18} color="#1FC595" />
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1FC595" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : recommendedTokens.length > 0 ? (
        <View>
          <View style={styles.tokenListContainer}>
            {getCurrentPageTokens().map((item, index) => (
              <View key={item.token_address || item.address || item.symbol} style={styles.tokenItemWrapper}>
                {renderRecommendedToken({ item, index })}
              </View>
            ))}
          </View>
          {renderPagination()}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tokens available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 10,
    paddingLeft: 0,
    paddingRight: 0,
    marginTop: 8,
    width: '100%',
    alignSelf: 'stretch',
    marginLeft:16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
    position: 'relative',
    height: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
  },
  refreshButton: {
    padding: 6,
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
  },
  tokenListContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    width: '100%',
    gap: 8,
  },
  tokenItemWrapper: {
    flex: 1,
    marginHorizontal: 0,
  },
  recommendedTokenItem: {
    backgroundColor: 'rgba(30, 32, 60, 0.8)',
    borderRadius: 12,
    padding: 0,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(31, 197, 149, 0.2)',
    overflow: 'hidden',
  },
  tokenButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  backupLogo: {
    position: 'absolute',
  },
  recommendedTokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  recommendedTokenInfo: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  recommendedTokenSymbol: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  recommendedTokenName: {
    color: '#8E8E8E',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 80,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    color: '#8E8E8E',
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: '#8E8E8E',
    fontSize: 14,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    height: 24,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(31, 197, 149, 0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#1FC595',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paginationButton: {
    padding: 8,
    marginHorizontal: 8,
  },
  tokenGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 12,
  },
});

export default RecommendedTokensList; 