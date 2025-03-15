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
  SectionList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import Header from '../../components/common/Header';
import { DeviceManager } from '../../utils/device';

export default function HistoryScreen({ navigation, route }) {
  const { walletId, deviceId, chain } = route.params || {};
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (deviceId && walletId) {
      fetchTransactions();
    }
  }, [deviceId, walletId]);

  const pollTransactionStatus = async (txHash, maxAttempts = 30) => {
    if (!txHash || isPolling) return;
    
    setIsPolling(true);
    let attempts = 0;
    
    try {
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Polling transaction status (${attempts}/${maxAttempts})`);
        
        try {
          const response = await api.getTokenTransfers(
            deviceId,
            chain?.toLowerCase() || 'sol',
            walletId,
            1,
            20
          );
          
          if (response?.data?.transactions) {
            const tx = response.data.transactions.find(t => t.tx_hash === txHash);
            if (tx) {
              if (tx.status === 'SUCCESS') {
                console.log('Transaction confirmed');
                await fetchTransactions(true);
                break;
              } else if (tx.status === 'FAILED') {
                console.error('Transaction failed');
                break;
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.warn('Error polling transaction:', error);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } finally {
      setIsPolling(false);
    }
  };

  const fetchTransactions = async (refresh = false) => {
    try {
      if (!deviceId || !walletId) {
        console.error('Missing required parameters:', { deviceId, walletId });
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
        
        const pendingTx = newTransactions.find(tx => tx.status === 'PENDING');
        if (pendingTx) {
          pollTransactionStatus(pendingTx.tx_hash);
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
        
        setHasMore(response.data.next !== null);
        if (!refresh) {
          setPage(currentPage + 1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupTransactionsByDate = (transactions) => {
    const groups = {};
    
    transactions.forEach(tx => {
      const date = parseISO(tx.block_timestamp || tx.created_at);
      let title = '';
      
      if (isToday(date)) {
        title = 'Today';
      } else if (isYesterday(date)) {
        title = 'Yesterday';
      } else if (isThisWeek(date)) {
        title = 'This Week';
      } else if (isThisMonth(date)) {
        title = 'This Month';
      } else {
        title = format(date, 'MMMM yyyy', { locale: enUS });
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

  const onRefresh = () => {
    fetchTransactions(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchTransactions(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount, direction) => {
    if (direction === 'RECEIVED') {
      return `+${amount}`;
    } else {
      return `-${amount}`;
    }
  };

  const getAmountColor = (direction) => {
    return direction === 'RECEIVED' ? '#1FC595' : '#FF5C5C';
  };

  const getTransactionTypeIcon = (txType, direction) => {
    if (txType === 'TRANSFER') {
      if (direction === 'RECEIVED') {
        return 'arrow-down-outline';
      } else {
        return 'arrow-up-outline';
      }
    } else if (txType === 'SWAP') {
      return 'swap-horizontal-outline';
    } else {
      return 'document-text-outline';
    }
  };

  const getTransactionTypeColor = (txType, direction) => {
    if (txType === 'TRANSFER') {
      if (direction === 'RECEIVED') {
        return '#1FC595';
      } else {
        return '#FF5C5C';
      }
    } else if (txType === 'SWAP') {
      return '#7B61FF';
    } else {
      return '#FFA500';
    }
  };

  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    return format(date, 'HH:mm');
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const typeIcon = getTransactionTypeIcon(item.tx_type, item.direction);
    const typeColor = getTransactionTypeColor(item.tx_type, item.direction);
    const amountColor = getAmountColor(item.direction);
    
    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
      >
        <View style={styles.tokenLogoContainer}>
          {item.token?.logo ? (
            <Image 
              source={{ uri: item.token.logo }} 
              style={styles.tokenLogo} 
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.tokenLogo, styles.fallbackLogo]}>
              <Text style={styles.fallbackLogoText}>
                {item.token?.symbol?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          <View style={[styles.typeIconContainer, { backgroundColor: typeColor }]}>
            <Ionicons name={typeIcon} size={12} color="#FFFFFF" />
          </View>
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.topRow}>
            <Text style={styles.tokenName} numberOfLines={1}>
              {item.token?.name || 'Unknown Token'}
            </Text>
            <Text style={[styles.amount, { color: amountColor }]}>
              {formatAmount(item.amount, item.direction)} {item.token?.symbol}
            </Text>
          </View>
          
          <View style={styles.bottomRow}>
            <Text style={styles.address} numberOfLines={1}>
              {item.direction === 'RECEIVED' ? 'From: ' : 'To: '}
              {formatAddress(item.direction === 'RECEIVED' ? item.from_address : item.to_address)}
            </Text>
            <Text style={styles.time}>
              {formatDate(item.block_timestamp || item.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#1FC595" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={60} color="#3A3F64" />
        <Text style={styles.emptyText}>No transaction records</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <Header 
        title="History" 
        onBack={() => navigation.goBack()}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.tx_hash}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1FC595']}
            tintColor="#1FC595"
          />
        }
        contentContainerStyle={transactions.length === 0 ? styles.listContentEmpty : styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#272C52',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    backgroundColor: '#1A1F3D',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    color: '#8E8E8E',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#272C52',
    alignItems: 'center',
  },
  tokenLogoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#272C52',
  },
  fallbackLogo: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1FC595',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#171C32',
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
  amount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#8E8E8E',
    fontSize: 16,
    marginTop: 16,
  },
});