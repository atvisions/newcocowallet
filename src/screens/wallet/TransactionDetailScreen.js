import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Clipboard,
  ToastAndroid,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function TransactionDetailScreen({ route, navigation }) {
  const { transaction } = route.params || {};
  
  // 添加打印信息
  console.log('Transaction Details:', {
    status: transaction?.status,
    type: transaction?.tx_type,
    token: transaction?.token,
    token_info: transaction?.token_info,
    full_transaction: transaction
  });
  
  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Transaction information unavailable</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const formatAddress = (address) => {
    if (!address) return '';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };
  
  const formatFullDate = (dateString) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  };
  
  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`${label} copied to clipboard`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', `${label} copied to clipboard`);
    }
  };
  
  const openExplorer = (txHash) => {
    let explorerUrl = `https://explorer.solana.com/tx/${txHash}`;
    Linking.openURL(explorerUrl).catch(err => {
      console.error('Unable to open browser:', err);
      Alert.alert('Error', 'Unable to open block explorer');
    });
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'CONFIRMED':
        return '#1FC595';
      case 'FAILED':
        return '#FF5C5C';
      case 'PENDING':
      case 'SENDING':
      case 'CONFIRMING':
        return '#FFA500';
      default:
        return '#8E8E8E';
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'CONFIRMED':
        return 'Confirmed';
      case 'FAILED':
        return 'Failed';
      case 'PENDING':
        return 'Pending';
      case 'SENDING':
        return 'Sending';
      case 'CONFIRMING':
        return 'Confirming';
      default:
        return 'Unknown';
    }
  };
  
  const getTransactionTypeText = (txType) => {
    switch (txType) {
      case 'TRANSFER':
        return 'Transfer';
      case 'SWAP':
        return 'Swap';
      default:
        return txType || 'Unknown';
    }
  };
  
  const getDirectionText = (direction) => {
    switch (direction) {
      case 'SENT':
        return 'Sent';
      case 'RECEIVED':
        return 'Received';
      default:
        return direction || 'Unknown';
    }
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

  const formatSolAmount = (amount) => {
    if (!amount) return '0 SOL';
    const value = parseFloat(amount);
    if (value === 0) return '0 SOL';
    
    // 如果数值小于 0.000001，使用科学计数法
    if (value < 0.000001) {
      return `${value.toExponential(4)} SOL`;
    }
    
    // 如果数值小于 0.001，保留 6 位小数
    if (value < 0.001) {
      return `${value.toFixed(6)} SOL`;
    }
    
    // 其他情况保留 4 位小数
    return `${value.toFixed(4)} SOL`;
  };
  
  const getTokenInfo = () => {
    // 如果是原生 SOL 转账
    if (!transaction.token && !transaction.token_info) {
      return {
        name: 'Solana',
        symbol: 'SOL',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        decimals: 9
      };
    }
    
    // 优先使用 token_info
    if (transaction.token_info) {
      return transaction.token_info;
    }
    
    // 如果有 token 对象
    if (transaction.token) {
      return transaction.token;
    }
    
    // 默认返回 Unknown
    return {
      name: 'Unknown Token',
      symbol: '???',
      logo: '',
      decimals: 0
    };
  };
  
  const renderDetailItem = ({ label, value, copyable, onPress }) => (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      {copyable ? (
        <TouchableOpacity 
          style={styles.copyContainer}
          onPress={onPress}
        >
          <Text style={styles.detailValue}>{value}</Text>
          <Ionicons name="copy-outline" size={16} color="#8E8E8E" style={styles.copyIcon} />
        </TouchableOpacity>
      ) : (
        <Text style={styles.detailValue}>{value}</Text>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Transaction Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.tokenInfoContainer}>
            {(() => {
              const tokenInfo = getTokenInfo();
              return (
                <>
                  {tokenInfo.logo ? (
                    <Image 
                      source={{ uri: tokenInfo.logo }} 
                      style={styles.tokenLogo} 
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.tokenLogo, styles.fallbackLogo]}>
                      <Text style={styles.fallbackLogoText}>
                        {tokenInfo.symbol?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.tokenName}>{tokenInfo.name}</Text>
                  <Text style={[styles.amount, { color: getAmountColor(transaction.direction) }]}>
                    {formatAmount(transaction.amount, transaction.direction)} {tokenInfo.symbol}
                  </Text>
                </>
              );
            })()}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
              <Text style={styles.statusText}>{getStatusText(transaction.status)}</Text>
            </View>
          </View>
        </View>

        {/* Transaction Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          {renderDetailItem({
            label: "Transaction Type",
            value: `${getTransactionTypeText(transaction.tx_type)} (${getDirectionText(transaction.direction)})`,
          })}
          {renderDetailItem({
            label: "From",
            value: formatAddress(transaction.from_address),
            copyable: true,
            onPress: () => copyToClipboard(transaction.from_address, 'Sender address')
          })}
          {renderDetailItem({
            label: "To",
            value: formatAddress(transaction.to_address),
            copyable: true,
            onPress: () => copyToClipboard(transaction.to_address, 'Recipient address')
          })}
          {renderDetailItem({
            label: "Transaction Hash",
            value: formatAddress(transaction.tx_hash),
            copyable: true,
            onPress: () => copyToClipboard(transaction.tx_hash, 'Transaction hash')
          })}
          {renderDetailItem({
            label: "Transaction Time",
            value: formatFullDate(transaction.block_timestamp || transaction.created_at)
          })}
          {renderDetailItem({
            label: "Gas Fee",
            value: formatSolAmount(transaction.gas_fee || (transaction.gas_price * transaction.gas_used))
          })}
        </View>
        
        {/* View in Explorer Button */}
        <TouchableOpacity 
          style={styles.explorerButton}
          onPress={() => openExplorer(transaction.tx_hash)}
        >
          <Text style={styles.explorerButtonText}>View in Block Explorer</Text>
          <Ionicons name="open-outline" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  scrollView: {
    flex: 1,
  },
  overviewCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1E2443',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tokenInfoContainer: {
    alignItems: 'center',
  },
  tokenLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  fallbackLogo: {
    backgroundColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackLogoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tokenName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#1E2443',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailLabel: {
    color: '#8E8E8E',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'right',
  },
  copyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyIcon: {
    marginLeft: 8,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3F64',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  explorerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20,
  },
  backButtonText: {
    color: '#1FC595',
    fontSize: 16,
    fontWeight: 'bold',
  },
});