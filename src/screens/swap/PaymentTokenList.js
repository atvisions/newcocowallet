import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { useWallet } from '../../contexts/WalletContext';
import { debounce } from 'lodash';
import Header from '../../components/common/Header';

const PaymentTokenList = ({ navigation, route }) => {
  const { selectedWallet } = useWallet();
  const { onSelectToken, selectedToken } = route.params;
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTokens = async () => {
    try {
      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();
      
      console.log('Loading payment tokens:', {
        deviceId,
        walletId: selectedWallet.id,
        chain: selectedWallet.chain
      });

      const response = await api.getTokensManagement(
        selectedWallet.id,
        deviceId,
        selectedWallet.chain
      );

      if (response?.status === 'success') {
        const tokenData = response.fromCache 
          ? response.data?.tokens || []
          : response.data?.data?.tokens || [];
        
        const newTokens = tokenData
          .filter(token => token.is_visible)
          .map(token => ({
            ...token,
            token_address: token.address || token.token_address,
            balance_formatted: token.balance_formatted || '0'
          }));

        const validTokens = newTokens.filter(token => {
          return token.token_address && token.symbol && token.decimals !== undefined;
        });

        setTokens(validTokens);
        setFilteredTokens(searchQuery ? filterTokens(searchQuery, validTokens) : validTokens);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Failed to load payment tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('Starting refresh...');
    setIsRefreshing(true);
    
    try {
      await loadTokens();
      console.log('Refresh completed successfully');
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      console.log('Resetting refresh state');
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [selectedWallet?.id]);

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
      <Image 
        source={{ uri: item.logo }} 
        style={styles.tokenLogo}
        defaultSource={require('../../../assets/default-token.png')}
      />
      <View style={styles.tokenInfo}>
        <View style={styles.tokenNameRow}>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
          <Text style={styles.tokenBalance}>
            Balance: {item.balance_formatted || '0'}
          </Text>
        </View>
        <Text style={styles.tokenName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header 
        title="Select Payment Token"
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
            onRefresh={handleRefresh}
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
  tokenNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  tokenBalance: {
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

export default PaymentTokenList; 