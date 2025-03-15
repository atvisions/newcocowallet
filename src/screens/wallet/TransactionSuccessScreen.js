import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Clipboard,
  ToastAndroid,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

export default function TransactionSuccessScreen({ route, navigation }) {
  const { 
    amount, 
    token, 
    recipientAddress, 
    transactionHash 
  } = route.params || {};
  
  const [tokenInfo, setTokenInfo] = useState(null);
  
  // 获取代币信息，包括 logo
  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        // 这里可以添加获取代币信息的逻辑，如果需要的话
        // 例如：const response = await api.getTokenDetails(...);
        // setTokenInfo(response.data);
        
        // 暂时使用默认值
        setTokenInfo({
          logo: null
        });
      } catch (error) {
        console.error('Failed to fetch token info:', error);
      }
    };
    
    fetchTokenInfo();
    
    // 打印交易哈希，用于调试
    console.log('Transaction hash in success screen:', transactionHash);
  }, []);

  const formatAddress = (address) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatHash = (hash) => {
    if (!hash) return '';
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`${label} copied to clipboard`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', `${label} has been copied to clipboard`);
    }
  };

  const handleDone = () => {
    // 返回到导航堆栈的顶部
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {tokenInfo?.logo ? (
              <Image 
                source={{ uri: tokenInfo.logo }} 
                style={styles.tokenLogo} 
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="checkmark" size={60} color="#FFFFFF" style={styles.checkIcon} />
            )}
          </View>

          <Text style={styles.title}>Transaction Successful</Text>
          
          <Text style={styles.amount}>{amount}</Text>
          <Text style={styles.token}>{token}</Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recipient Address:</Text>
              <TouchableOpacity 
                onPress={() => copyToClipboard(recipientAddress, 'Address')}
                style={styles.copyContainer}
              >
                <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                  {formatAddress(recipientAddress)}
                </Text>
                <Ionicons name="copy-outline" size={16} color="#8E8E8E" style={styles.copyIcon} />
              </TouchableOpacity>
            </View>
            
            {transactionHash ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Hash:</Text>
                <TouchableOpacity 
                  onPress={() => copyToClipboard(transactionHash, 'Transaction hash')}
                  style={styles.copyContainer}
                >
                  <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                    {formatHash(transactionHash)}
                  </Text>
                  <Ionicons name="copy-outline" size={16} color="#8E8E8E" style={styles.copyIcon} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Status:</Text>
                <Text style={styles.detailValue}>Completed</Text>
              </View>
            )}
            
            {/* 添加一个显示完整交易哈希的部分，用于调试 */}
            {__DEV__ && transactionHash && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugLabel}>Full Hash (Debug):</Text>
                <Text style={styles.debugValue}>{transactionHash}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.doneButton}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1FC595',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  checkIcon: {
    marginLeft: 2, // Slight adjustment for icon position
  },
  tokenLogo: {
    width: '70%',
    height: '70%',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 24,
  },
  amount: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  token: {
    fontSize: 18,
    color: '#8E8E8E',
    marginBottom: 40,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3F64',
  },
  detailLabel: {
    color: '#8E8E8E',
    fontSize: 14,
    flex: 0.4,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 0.6,
    textAlign: 'right',
  },
  copyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.6,
    justifyContent: 'flex-end',
  },
  copyIcon: {
    marginLeft: 6,
  },
  doneButton: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  debugLabel: {
    color: '#FF9500',
    fontSize: 12,
    marginBottom: 4,
  },
  debugValue: {
    color: '#FFFFFF',
    fontSize: 10,
    flexWrap: 'wrap',
  },
}); 