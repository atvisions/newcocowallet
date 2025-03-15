import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { useWallet } from '../../contexts/WalletContext';
import Header from '../../components/common/Header';

export default function TokenListScreen({ navigation, route }) {
  const { tokens = [] } = route.params || {};
  const [filteredTokens, setFilteredTokens] = useState(tokens);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    if (tokens.length > 0) {
      setFilteredTokens(tokens);
    }
  }, [tokens]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const parentNavigation = navigation.getParent();
      if (parentNavigation?.route?.params?.onSelect) {
        navigation.setOptions({
          onTokenSelect: (token) => {
            parentNavigation.route.params.onSelect(token);
            navigation.goBack();
          }
        });
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
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

  const handleTokenSelect = (token) => {
    const { onSelect } = route.params || {};
    
    if (onSelect) {
      onSelect(token);
      navigation.goBack();
    }
  };

  const onRefresh = async () => {
    setRefreshing(false);
  };

  const renderTokenItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tokenItem}
      onPress={() => handleTokenSelect(item)}
    >
      <View style={styles.tokenInfo}>
        <Image 
          source={{ uri: item.logo || 'https://via.placeholder.com/40' }} 
          style={styles.tokenLogo}
        />
        <View style={styles.tokenDetails}>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
          <Text style={styles.tokenName}>{item.name}</Text>
        </View>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.tokenBalance}>
          {parseFloat(item.balance_formatted).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 6
          })}
        </Text>
        <Text style={styles.tokenValue}>
          ${(parseFloat(item.balance_formatted) * parseFloat(item.price_usd || 0)).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Select Token" 
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#AAAAAA" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tokens"
          placeholderTextColor="#8E8E8E"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          color="#DDDDDD"
        />
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading tokens...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTokens}
          renderItem={renderTokenItem}
          keyExtractor={item => item.token_address || item.address}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tokens found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1F3D',
  },
  listContainer: {
    padding: 16,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#272C52',
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenDetails: {
    justifyContent: 'center',
  },
  tokenSymbol: {
    fontSize: 16,
    color: '#DDDDDD',
    fontWeight: 'normal',
  },
  tokenName: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: 'normal',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    fontSize: 16,
    color: '#DDDDDD',
    fontWeight: 'normal',
  },
  tokenValue: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#DDDDDD',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#DDDDDD',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#272C52',
  },
  searchIcon: {
    marginRight: 8,
    color: '#AAAAAA',
  },
  searchInput: {
    flex: 1,
    padding: 8,
    backgroundColor: '#1A1F3D',
    borderRadius: 8,
    color: '#DDDDDD',
  },
});