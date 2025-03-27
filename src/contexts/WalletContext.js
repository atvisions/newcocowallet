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
      // 获取设备ID
      const deviceId = await DeviceManager.getDeviceId();
      console.log('【钱包上下文】当前设备 ID:', deviceId);
      
      // 从服务器获取钱包数据
      const response = await api.getWallets(deviceId);
      console.log('【钱包上下文】获取到的钱包列表:', response);
      
      // 确保response.data.wallets是数组且有效
      if (response?.status === 'success' && Array.isArray(response.data?.wallets)) {
        const validWallets = processWalletList(response.data.wallets);
        
        // 先设置钱包列表
        setWallets(validWallets);
        await cacheWalletData(validWallets);
        
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
            const processedWallet = processWalletData(savedWallet);
            setSelectedWallet(processedWallet);
            console.log('【钱包上下文】设置选中钱包:', processedWallet.id);
          }
        }
        
        // 如果没有选中的钱包，选择第一个
        if (!savedWalletId && validWallets.length > 0) {
          const firstWallet = processWalletData(validWallets[0]);
          setSelectedWallet(firstWallet);
          await AsyncStorage.setItem('selectedWalletId', String(firstWallet.id));
          console.log('【钱包上下文】设置第一个钱包:', firstWallet.id);
        }
      }
    } catch (error) {
      console.error('【钱包上下文】加载钱包失败:', error);
      
      // 如果服务器请求失败，尝试使用缓存数据
      const cachedWallets = await loadCachedWalletData();
      if (cachedWallets && cachedWallets.length > 0) {
        console.log('【钱包上下文】使用缓存的钱包数据');
        setWallets(cachedWallets);
        
        // 尝试恢复选中的钱包
        const savedWalletId = await AsyncStorage.getItem('selectedWalletId');
        if (savedWalletId) {
          const savedWallet = cachedWallets.find(w => w.id === parseInt(savedWalletId, 10));
          if (savedWallet) {
            setSelectedWallet(processWalletData(savedWallet));
          }
        }
      }
    }
  };

  const updateSelectedWallet = useCallback(async (wallet) => {
    try {
      console.log('【DEBUG】开始更新选中钱包:', wallet);
      
      if (!wallet) {
        console.log('【DEBUG】清空钱包');
        await AsyncStorage.removeItem('selectedWalletId');
        setSelectedWallet(null);
        setTokens([]);
        return;
      }

      const processedWallet = processWalletData(wallet);
      console.log('【DEBUG】处理后的钱包数据:', processedWallet);

      await AsyncStorage.setItem('selectedWalletId', String(wallet.id));
      console.log('【DEBUG】已保存钱包ID:', wallet.id);
      
      // 增加延迟时间，确保状态更新完成
      await new Promise(resolve => {
        setTokens([]);
        setTimeout(() => {
          console.log('【DEBUG】设置新的选中钱包');
          setSelectedWallet(processedWallet);
          resolve();
        }, 100); // 增加到 100ms
      });

      // 添加额外的日志
      console.log('【DEBUG】钱包更新完成，当前状态:', {
        walletId: processedWallet.id,
        chain: processedWallet.chain
      });
    } catch (error) {
      console.error('【DEBUG】更新选中钱包失败:', error);
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

  // 添加状态监听
  useEffect(() => {
    console.log('【状态追踪】钱包状态变化:', {
      walletsCount: wallets.length,
      selectedWalletId: selectedWallet?.id,
      tokensCount: tokens.length,
      timestamp: new Date().toISOString()
    });
  }, [wallets, selectedWallet, tokens]);

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