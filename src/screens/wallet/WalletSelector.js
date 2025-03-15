import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  Platform,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import { useWallet } from '../../contexts/WalletContext';
import Header from '../../components/common/Header';
import { processWalletList } from '../../utils/walletUtils';

export default function WalletSelector({ navigation }) {
  const { selectedWallet, updateSelectedWallet } = useWallet();
  const [wallets, setWallets] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadWallets();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getWallets(deviceId);
      const processedWallets = processWalletList(response);
      setWallets(processedWallets);
      setIsRefreshing(false);
    } catch (error) {
      console.error('Failed to load wallets:', error);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadWallets();
  };

  const handleSelectWallet = async (wallet) => {
    try {
      navigation.goBack();
      updateSelectedWallet(wallet);
    } catch (error) {
      console.error('Failed to select wallet:', error);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const handleCreateWallet = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      navigation.navigate('SelectChain', {
        purpose: 'create',
        deviceId
      });
    } catch (error) {
      console.error('Failed to get device ID:', error);
    }
  };

  const handleImportWallet = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      navigation.navigate('SelectChain', {
        purpose: 'import',
        deviceId,
        fromWalletList: true
      });
    } catch (error) {
      console.error('Failed to get device ID:', error);
    }
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity 
        style={[styles.footerButton, styles.createButton]}
        onPress={handleCreateWallet}
      >
        <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
        <Text style={styles.footerButtonText}>Create Wallet</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.footerButton, styles.importButton]}
        onPress={handleImportWallet}
      >
        <Ionicons name="download-outline" size={24} color="#FFFFFF" />
        <Text style={styles.footerButtonText}>Import Wallet</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWalletItem = ({ item }) => {
    const isSelected = selectedWallet?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.walletItem,
          isSelected && styles.selectedWallet
        ]}
        onPress={() => handleSelectWallet(item)}
      >
        <View style={styles.walletItemContent}>
          <Image source={{ uri: item.avatar }} style={styles.walletAvatar} />
          <View style={styles.walletInfo}>
            <View style={styles.walletNameContainer}>
              <Text style={styles.walletName}>{item.name}</Text>
              <Text style={styles.chainName}>{item.chain}</Text>
            </View>
            <Text style={styles.walletAddress} numberOfLines={1}>
              {formatAddress(item.address)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('EditWallet', { wallet: item })}
          >
            <Ionicons name="settings-outline" size={20} color="#8E8E8E" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'left']}>
        <Header 
          title="Select Wallet"
          onBack={() => navigation.goBack()}
        />
        <FlatList
          data={wallets}
          renderItem={renderWalletItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Platform.OS === 'ios' ? 180 : 160 }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#1FC595"
              colors={['#1FC595']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
        {renderFooter()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  safeArea: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  walletItem: {
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedWallet: {
    borderColor: '#1FC595',
    borderWidth: 1,
  },
  walletItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  walletAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  walletInfo: {
    flex: 1,
  },
  walletNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  walletName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  chainName: {
    fontSize: 12,
    color: '#1FC595',
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  walletAddress: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#171C32',
    borderTopWidth: 1,
    borderTopColor: '#272C52',
    zIndex: 999,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    height: 56,
  },
  createButton: {
    backgroundColor: '#1FC595',
  },
  importButton: {
    backgroundColor: '#1FC595',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  settingsButton: {
    marginLeft: 12,
    padding: 4,
  },
});