import React, { useState, useEffect } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TokenSelectScreen = ({ navigation, route }) => {
  const { tokens, onSelect, type } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState(tokens);
  const insets = useSafeAreaInsets();

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

  const renderTokenItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tokenItem}
      onPress={() => {
        onSelect(item);
        navigation.goBack();
      }}
    >
      <Image 
        source={{ uri: item.logo }} 
        style={styles.tokenLogo}
        defaultSource={require('../../../assets/default-token.png')}
      />
      <View style={styles.tokenInfo}>
        <Text style={styles.tokenSymbol}>{item.symbol}</Text>
        <Text style={styles.tokenName}>{item.name}</Text>
      </View>
      <View style={styles.tokenBalance}>
        <Text style={styles.balanceText}>{item.balance_formatted}</Text>
        <Text style={styles.balanceUsd}>
          ${parseFloat(item.value_usd).toFixed(2)}
        </Text>
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
          keyExtractor={item => item.address}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matching tokens found</Text>
            </View>
          )}
        />
      </View>
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
  tokenBalance: {
    alignItems: 'flex-end',
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceUsd: {
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
});

export default TokenSelectScreen; 