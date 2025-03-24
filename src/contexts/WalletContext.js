import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { DeviceManager } from '../utils/device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processWalletData, processWalletList } from '../utils/walletUtils';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [tokensData, setTokensData] = useState(new Map());
  const lastUpdateTime = useRef(new Map());

  useEffect(() => {
    // 确保设备ID，然后加载钱包
    const initWallets = async () => {
      try {
        // 先确保设备ID
        await DeviceManager.ensureDeviceId();
        // 然后加载钱包
        await loadWallets();
      } catch (error) {
        console.error('初始化钱包失败:', error);
      }
    };
    
    initWallets();
  }, []);

  const cacheWalletData = async (wallets) => {
    try {
      if (Array.isArray(wallets) && wallets.length > 0) {
        // 处理数据后再缓存
        const processedWallets = processWalletList(wallets);
        await AsyncStorage.setItem('cachedWallets', JSON.stringify(processedWallets));
        console.log('【钱包上下文】钱包数据已缓存:', processedWallets.length);
      }
    } catch (error) {
      console.error('【钱包上下文】缓存钱包数据失败:', error);
    }
  };

  const loadCachedWalletData = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('cachedWallets');
      if (cachedData) {
        const wallets = JSON.parse(cachedData);
        console.log('【钱包上下文】从缓存加载的原始钱包数据:', wallets);
        
        // 重新处理钱包数据，确保头像URL正确
        const processedWallets = processWalletList(wallets);
        console.log('【钱包上下文】处理后的钱包数据:', processedWallets);
        
        return processedWallets;
      }
    } catch (error) {
      console.error('【钱包上下文】加载缓存钱包数据失败:', error);
    }
    return null;
  };

  const loadWallets = async () => {
    try {
      // 先尝试加载缓存数据
      const cachedWallets = await loadCachedWalletData();
      if (cachedWallets && cachedWallets.length > 0) {
        setWallets(cachedWallets);
        
        // 处理选中钱包
        const savedWalletId = await AsyncStorage.getItem('selectedWalletId');
        if (savedWalletId) {
          const savedWalletIdNumber = parseInt(savedWalletId, 10);
          const savedWallet = cachedWallets.find(wallet => wallet.id === savedWalletIdNumber);
          
          if (savedWallet) {
            // 确保选中的钱包也经过处理
            setSelectedWallet(processWalletData(savedWallet));
          } else {
            setSelectedWallet(processWalletData(cachedWallets[0]));
          }
        } else {
          setSelectedWallet(processWalletData(cachedWallets[0]));
        }
      }
      
      // 获取设备ID
      const deviceId = await DeviceManager.getDeviceId();
      console.log('【钱包上下文】当前设备 ID:', deviceId);
      
      // 从服务器获取钱包数据
      const response = await api.getWallets(deviceId);
      console.log('【钱包上下文】获取到的钱包列表:', response);
      
      // 确保response是数组且有效，并处理钱包数据
      if (Array.isArray(response) && response.length > 0) {
        const validWallets = processWalletList(response);
        setWallets(validWallets);
        await cacheWalletData(validWallets); // 缓存新数据
        
        // 如果没有钱包，清空选中的钱包
        if (validWallets.length === 0) {
          await AsyncStorage.removeItem('selectedWalletId');
          setSelectedWallet(null);
          setTokens([]);
          return;
        }

        // 从AsyncStorage中获取上次选择的钱包ID
        const savedWalletId = await AsyncStorage.getItem('selectedWalletId');
        console.log('【钱包上下文】加载保存的钱包ID:', savedWalletId);

        if (savedWalletId) {
          const savedWalletIdNumber = parseInt(savedWalletId, 10);
          const savedWallet = validWallets.find(wallet => wallet.id === savedWalletIdNumber);
          
          if (savedWallet) {
            setSelectedWallet(processWalletData(savedWallet));
          } else {
            setSelectedWallet(processWalletData(validWallets[0]));
            await AsyncStorage.setItem('selectedWalletId', String(validWallets[0].id));
          }
        } else if (validWallets.length > 0) {
          setSelectedWallet(processWalletData(validWallets[0]));
          await AsyncStorage.setItem('selectedWalletId', String(validWallets[0].id));
        }
      }
    } catch (error) {
      console.error('【钱包上下文】加载钱包失败:', error);
      
      // 如果服务器请求失败，但有缓存数据，继续使用缓存数据
      const cachedWallets = await loadCachedWalletData();
      if (cachedWallets && cachedWallets.length > 0) {
        console.log('【钱包上下文】使用缓存的钱包数据');
        return;
      }
      
      setWallets([]);
      setSelectedWallet(null);
      setTokens([]);
    }
  };

  const updateSelectedWallet = useCallback(async (wallet) => {
    try {
      // 如果是清空钱包，直接执行
      if (!wallet) {
        await AsyncStorage.removeItem('selectedWalletId');
        setSelectedWallet(null);
        setTokens([]);
        return;
      }

      // 处理钱包数据，确保头像URL正确
      const processedWallet = processWalletData(wallet);

      // 保存钱包ID到AsyncStorage
      await AsyncStorage.setItem('selectedWalletId', String(wallet.id));
      console.log('保存选中的钱包ID:', wallet.id);
      
      // 使用Promise确保状态更新的顺序
      await new Promise(resolve => {
        setTokens([]);
        setTimeout(() => {
          setSelectedWallet(processedWallet);
          resolve();
        }, 50);
      });
    } catch (error) {
      console.error('更新选中钱包失败:', error);
    }
  }, []);

  const updateSelectedChain = (chain) => {
    setSelectedChain(chain);
  };

  const checkAndUpdateWallets = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getWallets(deviceId);
      
      // 处理钱包数据
      const processedWallets = processWalletList(response);
      setWallets(processedWallets);
      
      return processedWallets;
    } catch (error) {
      console.error('Failed to check and update wallets:', error);
      return [];
    }
  };

  const updateTokensCache = useCallback((walletId, data) => {
    setTokensData(prev => {
      const newMap = new Map(prev);
      newMap.set(walletId, data);
      return newMap;
    });
    lastUpdateTime.current.set(walletId, Date.now());
  }, []);

  const getTokensCache = useCallback((walletId) => {
    return {
      data: tokensData.get(walletId),
      lastUpdate: lastUpdateTime.current.get(walletId) || 0
    };
  }, [tokensData]);

  const refreshTokens = useCallback(async () => {
    try {
      if (!selectedWallet?.id) return;
      
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getWalletTokens(
        deviceId,
        selectedWallet.id,
        selectedWallet.chain
      );

      if (response?.status === 'success' && response?.data?.tokens) {
        const visibleTokens = response.data.tokens.filter(token => token.is_visible);
        setTokens(visibleTokens);
        updateTokensCache(selectedWallet.id, response.data);
      }
    } catch (error) {
      console.error('刷新代币列表失败:', error);
    }
  }, [selectedWallet?.id, updateTokensCache]);

  const value = {
    wallets,
    selectedWallet,
    selectedChain,
    setWallets,
    setSelectedWallet,
    updateSelectedWallet,
    updateSelectedChain,
    checkAndUpdateWallets,
    loadWallets,
    tokens,
    setTokens,
    tokensData,
    updateTokensCache,
    getTokensCache,
    refreshTokens,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  return useContext(WalletContext);
};