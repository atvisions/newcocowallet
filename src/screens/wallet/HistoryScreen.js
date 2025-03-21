import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import Header from '../../components/common/Header';
import { DeviceManager } from '../../utils/device';

// 添加 TokenLogo 组件
const TokenLogo = ({ uri, symbol, size = 40, style = {} }) => {
  const [hasError, setHasError] = useState(false);
  
  // 生成基于符号的颜色
  const getColorFromSymbol = (symbol) => {
    if (!symbol) return '#1FC595';
    
    // 简单的哈希函数生成颜色
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 转换为HSL颜色
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
  };
  
  const backgroundColor = getColorFromSymbol(symbol);
  
  if (hasError || !uri) {
    // 如果图片加载失败或没有URI，显示文字图标
    return (
      <View 
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            justifyContent: 'center',
            alignItems: 'center'
          },
          style
        ]}
      >
        <Text style={{
          color: '#FFFFFF',
          fontSize: size * 0.4,
          fontWeight: 'bold'
        }}>
          {symbol ? symbol.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
    );
  }
  
  return (
    <Image
      source={{ uri }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#272C52'
        },
        style
      ]}
      onError={() => setHasError(true)}
    />
  );
};

export default function HistoryScreen({ navigation, route }) {
  const { walletId, deviceId, chain } = route.params || {};
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (deviceId && walletId) {
      fetchTransactions();
    }
    
    // 设置状态栏
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
    
    return () => {
      // 恢复状态栏
      StatusBar.setBarStyle('light-content');
    };
  }, [deviceId, walletId]);

  const fetchTransactions = async (refresh = false) => {
    try {
      if (!deviceId || !walletId) {
        console.error('缺少必要参数:', { deviceId, walletId });
        return;
      }

      if (refresh) {
        setPage(1);
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const currentPage = refresh ? 1 : page;
      
      const response = await api.getTokenTransfers(
        deviceId,
        chain?.toLowerCase() || 'sol',
        walletId,
        currentPage
      );

      if (response?.data) {
        const newTransactions = response.data.transactions || [];
        
        // 如果返回的交易列表为空，则认为没有更多数据
        if (newTransactions.length === 0) {
          setHasMore(false);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        
        if (refresh || currentPage === 1) {
          setTransactions(newTransactions);
          const groupedData = groupTransactionsByDate(newTransactions);
          setSections(groupedData);
        } else {
          setTransactions(prev => [...prev, ...newTransactions]);
          const allTransactions = [...transactions, ...newTransactions];
          const groupedData = groupTransactionsByDate(allTransactions);
          setSections(groupedData);
        }
        
        // 使用 total 和当前已加载的交易数量来判断是否还有更多数据
        const total = response.data.total || 0;
        setHasMore(transactions.length + newTransactions.length < total);
        
        if (!refresh) {
          setPage(currentPage + 1);
        }
      }
    } catch (error) {
      console.error('获取交易记录失败:', error);
      // 如果是因为没有更多数据导致的错误，不显示错误状态，只设置 hasMore 为 false
      if (error.message === '本页结果为空') {
        setHasMore(false);
      } else {
        setError(error.message || 'Failed to fetch transactions');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchTransactions(true);
  };

  const loadMore = () => {
    if (loading || refreshing || !hasMore) return;
    fetchTransactions();
  };

  const groupTransactionsByDate = (transactions) => {
    const groups = {};
    
    transactions.forEach(tx => {
      const date = parseISO(tx.block_timestamp);
      let title = '';
      
      if (isToday(date)) {
        title = 'Today';
      } else if (isYesterday(date)) {
        title = 'Yesterday';
      } else if (isThisWeek(date)) {
        title = format(date, 'EEEE', { locale: enUS });
      } else if (isThisMonth(date)) {
        title = format(date, 'MMMM d', { locale: enUS });
      } else {
        title = format(date, 'MMMM d, yyyy', { locale: enUS });
      }
      
      if (!groups[title]) {
        groups[title] = [];
      }
      
      groups[title].push(tx);
    });
    
    return Object.keys(groups).map(title => ({
      title,
      data: groups[title]
    }));
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp) => {
    try {
      const date = parseISO(timestamp);
      return format(date, 'HH:mm');
    } catch (error) {
      return '';
    }
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  // 修改交易渲染函数，使用圆角卡片布局
  const renderTransaction = ({ item }) => {
    const isSwap = item.tx_type === 'SWAP';
    const isPending = item.status === 'PENDING';
    
    // 获取主代币信息
    const token = item.token || { symbol: 'Unknown', logo: '' };
    
    // 获取 SWAP 交易的目标代币信息
    const toToken = isSwap && item.swap_info ? {
      symbol: item.swap_info.to_token_symbol || 'Unknown',
      logo: item.swap_info.to_token_logo || ''
    } : null;
    
    // 格式化金额显示
    let amountDisplay = '';
    if (isSwap) {
      amountDisplay = `${formatTokenAmount(item.amount, token.decimals)} ${token.symbol} → ${item.swap_info?.to_token_symbol || 'Unknown'}`;
    } else if (item.direction === 'SENT') {
      amountDisplay = `- ${formatTokenAmount(item.amount, token.decimals)} ${token.symbol}`;
    } else {
      amountDisplay = `+ ${formatTokenAmount(item.amount, token.decimals)} ${token.symbol}`;
    }
    
    return (
      <View style={styles.cardContainer}>
        <View style={styles.transactionCard}>
          <View style={styles.tokenLogoContainer}>
            {/* 主代币 Logo */}
            <TokenLogo 
              uri={token.logo} 
              symbol={token.symbol} 
              size={40}
            />
            
            {/* SWAP 交易的目标代币 Logo */}
            {isSwap && toToken && (
              <TokenLogo 
                uri={toToken.logo} 
                symbol={toToken.symbol} 
                size={24}
                style={{
                  position: 'absolute',
                  bottom: -5,
                  right: -5,
                  borderWidth: 2,
                  borderColor: '#171C32'
                }}
              />
            )}
          </View>
          
          <View style={styles.transactionDetails}>
            <View style={styles.topRow}>
              <Text style={styles.tokenName} numberOfLines={1} ellipsizeMode="tail">
                {isSwap ? 'Swap' : item.direction === 'SENT' ? 'Sent' : 'Received'}
                {isPending && <Text style={styles.pendingText}> (Pending)</Text>}
              </Text>
              <Text style={[
                styles.amount, 
                { 
                  color: isSwap ? '#FFFFFF' : 
                    item.direction === 'RECEIVED' ? '#1FC595' : '#FF3B30' 
                }
              ]} numberOfLines={1} ellipsizeMode="tail">
                {amountDisplay}
              </Text>
            </View>
            
            <View style={styles.bottomRow}>
              <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
                {isSwap ? 
                  `${formatAddress(item.from_address)} ↔ ${formatAddress(item.to_address)}` : 
                  item.direction === 'SENT' ? 
                    `To: ${formatAddress(item.to_address)}` : 
                    `From: ${formatAddress(item.from_address)}`
                }
              </Text>
              <Text style={styles.time}>{formatTime(item.block_timestamp)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const formatTokenAmount = (amount, decimals = 0) => {
    try {
      if (!amount) return '0';
      
      // 将金额转换为实际值（考虑精度）
      const actualAmount = amount / Math.pow(10, decimals);
      
      // 格式化显示
      if (actualAmount < 0.001) {
        return '<0.001';
      } else if (actualAmount < 1) {
        return actualAmount.toFixed(3);
      } else if (actualAmount < 10000) {
        return actualAmount.toFixed(2);
      } else if (actualAmount < 1000000) {
        return (actualAmount / 1000).toFixed(2) + 'K';
      } else {
        return (actualAmount / 1000000).toFixed(2) + 'M';
      }
    } catch (error) {
      console.error('格式化金额错误:', error);
      return '0';
    }
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#1FC595" />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#8E8E8E" />
      <Text style={styles.emptyText}>No transactions found</Text>
    </View>
  );

  // 自定义 Header 组件，修复顶部距离问题
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Transaction History</Text>
      <View style={styles.headerRight} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {renderHeader()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1FC595" />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : transactions.length === 0 ? (
        renderEmptyState()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.tx_hash}
          renderItem={renderTransaction}
          renderSectionHeader={renderSectionHeader}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1FC595']}
              tintColor="#1FC595"
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  // 自定义 Header 样式
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 44, // 适配不同设备的状态栏高度
    paddingBottom: 10,
    backgroundColor: '#171C32',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40, // 保持对称
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  // 修改为卡片样式
  cardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  transactionCard: {
    backgroundColor: '#1A1E33',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    // 添加阴影效果
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  sectionHeaderText: {
    color: '#8E8E8E',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tokenLogoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tokenName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  pendingText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: 'normal',
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: '60%', // 限制宽度，防止超出卡片
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  address: {
    color: '#8E8E8E',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  time: {
    color: '#8E8E8E',
    fontSize: 12,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#8E8E8E',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1FC595',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});