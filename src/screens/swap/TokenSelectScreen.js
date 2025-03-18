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
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Toast
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceManager } from '../../utils/device';
import { api } from '../../services/api';
import { useWallet } from '../../contexts/WalletContext';
import { useFocusEffect } from '@react-navigation/native';
import { debounce } from 'lodash';

const TokenSelectScreen = ({ navigation, route }) => {
  const { tokens: initialTokens, type, onSelect } = route.params;
  const { selectedWallet } = useWallet();
  const [tokens, setTokens] = useState(type === 'to' ? initialTokens : []);
  const [isLoading, setIsLoading] = useState(type === 'from');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState(type === 'to' ? initialTokens : []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadTokens = async () => {
    if (type === 'from') {
      try {
        setIsLoading(true);
        const deviceId = await DeviceManager.getDeviceId();
        
        console.log('Loading user token list:', {
          deviceId,
          walletId: selectedWallet.id,
          chain: selectedWallet.chain
        });

        const response = await api.getTokensManagement(
          selectedWallet.id,
          deviceId,
          selectedWallet.chain
        );

        console.log('Token response:', response);

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
            const isValid = token.token_address && 
                           token.symbol && 
                           token.decimals !== undefined;
            
            if (!isValid) {
              console.error('Invalid token data detected:', {
                address: token.token_address,
                symbol: token.symbol,
                decimals: token.decimals
              });
            }
            return isValid;
          });

          console.log('Processed token list:', validTokens.map(t => ({
            symbol: t.symbol,
            decimals: t.decimals,
            address: t.token_address,
            balance: t.balance_formatted
          })));

          setTokens(validTokens);
          setFilteredTokens(searchQuery ? filterTokens(searchQuery, validTokens) : validTokens);
        } else {
          throw new Error('Invalid response');
        }
      } catch (error) {
        console.error('Failed to load user token list:', error);
        if (route.params?.tokens?.length > 0) {
          console.log('Using token list from route parameters');
          setTokens(route.params.tokens);
          setFilteredTokens(route.params.tokens);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        setIsLoading(true);
        const deviceId = await DeviceManager.getDeviceId();
        
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const response = await api.getSolanaSwapTokens(
              selectedWallet.id,
              deviceId
            );

            if (response?.status === 'success' && response.data?.tokens) {
              const newTokens = response.data.tokens;
              setTokens(newTokens);
              setFilteredTokens(searchQuery ? filterTokens(searchQuery, newTokens) : newTokens);
              break;
            } else {
              throw new Error('Invalid response format');
            }
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      } catch (error) {
        console.error('Failed to load swap token list:', error);
        const defaultTokens = [
          {
            symbol: 'SOL',
            name: 'Solana',
            token_address: 'So11111111111111111111111111111111111111112',
            decimals: 9,
            logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6,
            logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
          },
        ];
        
        setTokens(defaultTokens);
        setFilteredTokens(defaultTokens);
        Toast.show('Unable to load complete token list, showing default tokens', 'error');
      }
    }
  };

  const onRefresh = React.useCallback(() => {
    if (type === 'from') {
      setIsRefreshing(true);
      loadTokens();
    }
  }, [type]);

  const debouncedLoadTokens = useCallback(
    debounce(() => {
      loadTokens();
    }, 300),
    []
  );

  useFocusEffect(
    React.useCallback(() => {
      if (type === 'from') {
        loadTokens();
      }
      return () => {
        if (type === 'from') {
          setTokens([]);
          setFilteredTokens([]);
        }
      };
    }, [selectedWallet?.id, type])
  );

  useEffect(() => {
    if (!tokens) return;
    
    if (searchQuery.trim() === '') {
      setFilteredTokens(tokens);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tokens.filter(token => 
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
      setFilteredTokens(filtered);
    }
  }, [searchQuery, tokens]);

  const renderTokenItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tokenItem}
      onPress={() => {
        onSelect(item);
        navigation.goBack();
      }}
      key={item.token_address || item.address}
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
            {type === 'from' ? `Balance: ${item.balance_formatted || '0'}` : ''}
          </Text>
        </View>
        <Text style={styles.tokenName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(31, 197, 149, 0.1)', '#171C32']}
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
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Select {type === 'from' ? 'Payment' : 'Receiving'} Token
          </Text>
          <View style={styles.headerRight} />
        </View>

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
            type === 'from' ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#1FC595"
                colors={['#1FC595']}
              />
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading...' : searchQuery ? 'No matching tokens found' : 'No tokens available'}
              </Text>
            </View>
          )}
        />
      </View>

      {isLoading && !isRefreshing && type === 'from' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1FC595" />
        </View>
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
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
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
  tokenNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

export default TokenSelectScreen; 