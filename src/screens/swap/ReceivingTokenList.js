import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { useWallet } from '../../contexts/WalletContext';
import Toast from '../../components/Toast';
import Header from '../../components/common/Header';

let cachedTokens = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 缓存5分钟

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

const ReceivingTokenList = ({ navigation, route }) => {
  const { selectedWallet } = useWallet();
  const { onSelectToken, selectedToken } = route.params;
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadAttempts, setLoadAttempts] = useState(0);

  const loadSwapTokens = useCallback(async (forceRefresh = false) => {
    try {
      // 检查缓存是否可用
      const now = Date.now();
      if (!forceRefresh && cachedTokens && (now - lastFetchTime < CACHE_DURATION)) {
        console.log('使用缓存的代币列表数据');
        setTokens(cachedTokens);
        setFilteredTokens(searchQuery ? filterTokens(searchQuery, cachedTokens) : cachedTokens);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setIsLoading(!cachedTokens);
      const deviceId = await DeviceManager.getDeviceId();
      
      console.log('从API加载接收代币列表:', {
        deviceId,
        walletId: selectedWallet?.id,
        isForcedRefresh: forceRefresh
      });

      // 使用 api.getSolanaSwapTokens 方法
      const response = await api.getSolanaSwapTokens(
        selectedWallet.id,
        deviceId
      );

      if (response?.status === 'success' && response.data?.tokens) {
        const newTokens = response.data.tokens.map(token => ({
          ...token,
          token_address: token.address || token.token_address // 确保token_address字段存在
        }));
        
        // 更新缓存
        cachedTokens = newTokens;
        lastFetchTime = now;
        
        setTokens(newTokens);
        setFilteredTokens(searchQuery ? filterTokens(searchQuery, newTokens) : newTokens);
        console.log('代币列表已更新并缓存，共', newTokens.length, '个代币');
      }
    } catch (error) {
      console.error('加载代币列表失败:', error);
      
      // 如果有缓存数据，在请求失败时使用缓存
      if (cachedTokens) {
        console.log('请求失败，使用缓存数据');
        setTokens(cachedTokens);
        setFilteredTokens(searchQuery ? filterTokens(searchQuery, cachedTokens) : cachedTokens);
      } else {
        // 使用默认代币作为备选
        const defaultTokens = [
          {
            symbol: 'SOL',
            name: 'Wrapped SOL',
            token_address: 'So11111111111111111111111111111111111111112',
            address: 'So11111111111111111111111111111111111111112',
            decimals: 9,
            logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6,
            logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
          }
        ];
        
        setTokens(defaultTokens);
        setFilteredTokens(defaultTokens);
        Toast.show('Unable to load complete token list, showing default tokens', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedWallet?.id, searchQuery]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadSwapTokens(true); // 强制刷新
  }, [loadSwapTokens]);

  // 组件挂载时加载数据
  useEffect(() => {
    if (selectedWallet?.id) {
      loadSwapTokens();
    }
  }, [selectedWallet?.id]);

  // 组件卸载时清理缓存
  useEffect(() => {
    return () => {
      // 可以选择是否在组件卸载时清理缓存
      // cachedTokens = null;
      // lastFetchTime = 0;
    };
  }, []);

  // 确保组件可见时重新加载数据
  useEffect(() => {
    const loadData = async () => {
      // 如果没有数据且不在加载中，尝试加载
      if (tokens.length === 0 && !isLoading && selectedWallet?.id) {
        await loadSwapTokens();
      }
    };
    
    loadData();
  }, []);

  // 处理搜索
  useEffect(() => {
    if (!tokens) return;
    
    if (searchQuery.trim() === '') {
      setFilteredTokens(tokens);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address?.toLowerCase().includes(query) ||
        token.token_address?.toLowerCase().includes(query)
      );
      setFilteredTokens(filtered);
    }
  }, [searchQuery, tokens]);

  // 修改 renderTokenItem 传递 symbol 属性
  const renderTokenItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.tokenItem, 
        selectedToken?.token_address === item.token_address && styles.selectedTokenItem
      ]}
      onPress={() => {
        onSelectToken(item);
        navigation.goBack();
      }}
    >
      <TokenLogo 
        uri={item.logo} 
        symbol={item.symbol}
        style={styles.tokenLogo}
      />
      <View style={styles.tokenInfo}>
        <Text style={styles.tokenSymbol}>{item.symbol}</Text>
        <Text style={styles.tokenName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header 
        title="Select Receiving Token"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8E8E8E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search token name or address"
            placeholderTextColor="#8E8E8E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#8E8E8E" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredTokens}
        renderItem={renderTokenItem}
        keyExtractor={item => item.token_address || item.address || item.symbol}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#1FC595"
            colors={['#1FC595']}
            progressBackgroundColor="rgba(30, 32, 60, 0.8)"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading...' : searchQuery ? 'No matching tokens found' : 'No tokens available'}
            </Text>
          </View>
        )}
      />

      {isLoading && !isRefreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1FC595" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2C41',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#272C52',
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedTokenItem: {
    borderColor: '#1FC595',
    borderWidth: 1,
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
  tokenSymbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tokenName: {
    color: '#8E8E8E',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#8E8E8E',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(23, 28, 50, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReceivingTokenList; 