import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { api } from '../services/api';
import { DeviceManager } from '../utils/device';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

// 将 currentGatewayIndex 移到组件内部管理
const NFTItem = React.memo(({ item, chain }) => {
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const getImageUrl = (uri) => {
    if (!uri) return null;
    
    if (uri.startsWith('ipfs://')) {
      const ipfsHash = uri.replace('ipfs://', '');
      return `${IPFS_GATEWAYS[currentGatewayIndex]}${ipfsHash}`;
    }
    
    return uri;
  };

  const imageUrl = chain === 'sol' 
    ? item.image_url 
    : getImageUrl(item.image);
  
  const name = item.name;
  const number = chain === 'sol' 
    ? name.split('#')[1]
    : item.token_id;

  const handleImageError = () => {
    if (imageUrl && imageUrl.includes('ipfs')) {
      if (currentGatewayIndex < IPFS_GATEWAYS.length - 1) {
        setCurrentGatewayIndex(prev => prev + 1);
      } else {
        setImageError(true);
      }
    } else {
      setImageError(true);
    }
  };

  if (imageError) {
    return (
      <TouchableOpacity style={styles.nftItem}>
        <View style={[styles.nftImage, styles.placeholderContainer]}>
          <Ionicons name="image-outline" size={40} color="#8E8E8E" />
        </View>
        <View style={styles.nftInfo}>
          <Text style={styles.nftName} numberOfLines={1}>{name}</Text>
          <Text style={styles.tokenId}>#{number}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.nftItem}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.nftImage}
        resizeMode="cover"
        onError={handleImageError}
      />
      <View style={styles.nftInfo}>
        <Text style={styles.nftName} numberOfLines={1}>{name}</Text>
        <Text style={styles.tokenId}>#{number}</Text>
      </View>
    </TouchableOpacity>
  );
});

const renderHeader = (collection, chain, navigation) => (
  <View style={styles.header}>
    <TouchableOpacity 
      style={styles.backButton}
      onPress={() => navigation.goBack()}
    >
      <Ionicons name="chevron-back" size={24} color="#1FC595" />
    </TouchableOpacity>
    <Text style={styles.title} numberOfLines={1}>
      {chain === 'sol' ? collection.symbol : collection.name}
    </Text>
    <View style={styles.rightPlaceholder} />
  </View>
);

export default function NFTCollection({ route, navigation }) {
  const { collection, chain, walletId, collectionAddress } = route.params;
  const [nfts, setNfts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCollectionNFTs();
  }, []);

  const loadCollectionNFTs = async () => {
    try {
      console.log('Loading NFTs with params:', {
        chain,
        walletId,
        collectionAddress
      });
      
      setIsLoading(true);
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getNFTsByCollection(
        deviceId,
        chain,
        walletId,
        collectionAddress
      );
      
      console.log('NFTs response:', response);
      
      if (response?.status === 'success') {
        if (chain === 'sol') {
          setNfts(response.data.nfts || []);
        } else {
          setNfts(response.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load collection NFTs:', error);
      setError('加载 NFT 失败');
    } finally {
      setIsLoading(false);
    }
  };

  const renderNFTItem = useCallback(({ item }) => (
    <NFTItem 
      item={item}
      chain={chain}
    />
  ), [chain]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header 
          title="NFT Collection"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1FC595" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header 
          title="NFT Collection"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="NFT Collection"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <FlatList
          data={nfts}
          renderItem={renderNFTItem}
          keyExtractor={item => item.token_id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  rightPlaceholder: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 12,
  },
  nftItem: {
    flex: 1,
    margin: 6,
    backgroundColor: '#272C52',
    borderRadius: 12,
    overflow: 'hidden',
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  tokenId: {
    fontSize: 12,
    color: '#8E8E8E',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 16,
  },
  placeholderContainer: {
    backgroundColor: '#2A2F4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listContent: {
    padding: 12,
  },
});