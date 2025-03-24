import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Loading from '../../components/common/Loading';
import Header from '../../components/common/Header';
import { DeviceManager } from '../../utils/device';
import { getReferralInfo, clearReferralInfo } from '../../utils/referral';

//const SUPPORTED_CHAINS = ['ETH', 'BASE', 'SOL'];
const SUPPORTED_CHAINS = ['SOL'];
// 添加链的默认 logo 映射
const DEFAULT_CHAIN_LOGOS = {
  'ETH': require('../../../assets/chains/ethereum.png'),
  'BASE': require('../../../assets/chains/base.png'),
  'SOL': require('../../../assets/chains/solana.png')
};

export default function SelectChain({ navigation, route }) {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { deviceId } = route.params || {};

  useEffect(() => {
    if (!deviceId) {
      Alert.alert('Error', 'Device ID is required to load chains.');
      return;
    }
    loadChains();
  }, [deviceId]);

  const loadChains = async () => {
    try {
      setLoading(true);
      const response = await api.getSupportedChains();
      console.log('Supported chains response:', response);
      const filteredChains = Object.entries(response.data.supported_chains)
        .filter(([key]) => SUPPORTED_CHAINS.includes(key))
        .map(([key, value]) => ({ 
          id: key, 
          ...value
        }));
      setChains(filteredChains);
    } catch (error) {
      Alert.alert('Error', 'Failed to load supported chains');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChains();
  };

  const handleChainSelect = async (chain) => {
    const { purpose } = route.params;
    console.log('Selected chain:', chain);
    console.log('Purpose:', purpose);

    try {
      const response = await api.selectChain(deviceId, chain);
      console.log('Select chain response:', response);

      if (response.status === 'success') {
        if (!response.data.mnemonic) {
          throw new Error('No mnemonic received');
        }
        if (purpose === 'create') {
          navigation.navigate('ShowMnemonic', {
            mnemonic: response.data.mnemonic,
            chain,
            deviceId,
          });
        } else if (purpose === 'import') {
          navigation.navigate('ImportWallet', {
            chain,
            deviceId
          });
        }
      }
    } catch (error) {
      console.error('Failed to select chain:', error);
      Alert.alert('Error', 'Failed to select chain');
    }
  };

  const renderChainItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chainItem}
      onPress={() => handleChainSelect(item.id)}
    >
      <Image 
        source={DEFAULT_CHAIN_LOGOS[item.id]}
        style={styles.chainLogo}
      />
      <View style={styles.chainInfo}>
        <Text style={styles.chainName}>{item.name}</Text>
        <Text style={styles.chainSymbol}>{item.id}</Text>
        <Text style={styles.chainDescription}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#8E8E8E" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Select Chain"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        {loading ? (
          <Loading />
        ) : (
          <FlatList
            data={chains}
            renderItem={renderChainItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  chainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272C52',
    borderRadius: 12,
    paddingLeft: 26,
    marginBottom: 12,
    paddingRight: 16,
  },
  chainLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chainInfo: {
    flex: 1,
    marginLeft: 2,
    justifyContent: 'center',  // 确保文字容器垂直居中
  },
  chainName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 20,  // 添加行高确保文字对齐
    marginTop: 20,  // 微调两行文字间距
  },
  chainSymbol: {
    fontSize: 14,
    color: '#8E8E8E',
    marginTop: 2,  // 微调两行文字间距
    lineHeight: 18,  // 添加行高确保文字对齐
  },
  chainDescription: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  chainSymbol: {
    fontSize: 14,
    color: '#1FC595',
    marginBottom: 4,
  },
});