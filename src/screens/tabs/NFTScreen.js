import React, { useState, useEffect } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  StatusBar,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { useWallet } from '../../contexts/WalletContext';
import { useWalletNavigation } from '../../hooks/useWalletNavigation';

const windowWidth = Dimensions.get('window').width;
const COLUMN_COUNT = 2;
const SPACING = 12;
const ITEM_WIDTH = (windowWidth - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

function getImageUrl(uri) {
  if (!uri) return null;
  
  if (uri.startsWith('ipfs://')) {
    const ipfsHash = uri.replace('ipfs://', '');
    return `${IPFS_GATEWAY}${ipfsHash}`;
  }
  
  return uri;
}

export default function NFTScreen({ navigation }) {
  const { selectedWallet } = useWallet();
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [nfts, setNFTs] = useState([]);
  const [error, setError] = useState(null);
  const [chain, setChain] = useState(null);

  useWalletNavigation(navigation);

  useEffect(() => {
    if (selectedWallet) {
      loadCollections();
    }
  }, [selectedWallet]);

  const loadCollections = async (showLoading = true) => {
    try {
      console.log('Loading NFT collections for wallet:', selectedWallet);
      if (showLoading) {
        setIsLoading(true);
      }
      const deviceId = await DeviceManager.getDeviceId();
      if (!selectedWallet) return;

      const chain = selectedWallet.chain.toLowerCase();
      setChain(chain);
      console.log('Selected Wallet Chain:', selectedWallet.chain);

      console.log(`Fetching NFT collections with parameters: 
        Device ID: ${deviceId}, 
        Chain: ${chain}, 
        Wallet ID: ${selectedWallet.id}`);

      const response = await api.getNFTCollections(deviceId, chain, selectedWallet.id);
      
      console.log('NFT Collections Response:', response);

      if (response?.data) {
        setCollections(response.data);
        setFailedImages(new Set());
      }
    } catch (error) {
      console.error('Failed to load NFT collections:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCollections(false);
  };

  const handleImageError = (imageUrl) => {
    setFailedImages(prev => new Set([...prev, imageUrl]));
  };

  const handleCollectionPress = (collection) => {
    const chain = selectedWallet.chain.toLowerCase();
    console.log('Collection data:', {
      chain,
      collection,
      collectionAddress: chain === 'sol' ? collection.symbol : collection.contract_address
    });
    
    navigation.navigate('NFTCollection', {
      collection,
      chain,
      walletId: selectedWallet.id,
      collectionAddress: chain === 'sol' ? collection.symbol : collection.contract_address
    });
  };

  const renderCollectionItem = ({ item }) => {
    const imageUrl = chain === 'sol' 
      ? item.image_url 
      : getImageUrl(item.logo);
    
    const shouldShowPlaceholder = !imageUrl || failedImages.has(imageUrl);
    
    const displayName = chain === 'sol' ? item.symbol : item.name;

    return (
      <TouchableOpacity 
        style={styles.nftItem}
        onPress={() => handleCollectionPress(item)}
      >
        {shouldShowPlaceholder ? (
          <View style={[styles.nftImage, styles.placeholderContainer]}>
            <Ionicons name="image-outline" size={40} color="#8E8E8E" />
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.nftImage}
            resizeMode="cover"
            onError={() => handleImageError(imageUrl)}
          />
        )}
        <View style={styles.nftInfo}>
          <Text style={styles.nftName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.nftCount}>
            {item.nft_count} {item.nft_count > 1 ? 'items' : 'item'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="images-outline" size={40} color="#8E8E8E" />
      </View>
      <Text style={styles.emptyTitle}>No NFTs Yet</Text>
      <Text style={styles.emptyDescription}>
        Your NFT collections will appear here once you have them
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NFTs</Text>
      </View>

      <FlatList
        data={collections}
        renderItem={renderCollectionItem}
        keyExtractor={item => item.address || item.contract_address}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={!isLoading && renderEmptyState()}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#1FC595"
            colors={['#1FC595']}
          />
        }
      />

      {isLoading && <ActivityIndicator size="large" color="#0000ff" />}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    marginTop: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listContainer: {
    padding: SPACING,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  nftItem: {
    width: ITEM_WIDTH,
    backgroundColor: '#272C52',
    borderRadius: 12,
    marginBottom: SPACING,
    overflow: 'hidden',
  },
  nftImage: {
    width: '100%',
    height: ITEM_WIDTH,
    backgroundColor: '#343B66',
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nftCount: {
    fontSize: 12,
    color: '#8E8E8E',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(142, 142, 142, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
    lineHeight: 20,
  },
  placeholderContainer: {
    backgroundColor: '#343B66',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});