import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { DeviceManager } from '../utils/device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [tokensData, setTokensData] = useState(new Map());
  const lastUpdateTime = useRef(new Map());

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      console.log('【钱包上下文】当前设备 ID:', deviceId);
      
      const response = await api.getWallets(deviceId);
      console.log('【钱包上下文】获取到的钱包列表:', response);
      
      // 确保response是数组且有效
      const validWallets = Array.isArray(response) ? response : [];
      setWallets(validWallets);

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
          setSelectedWallet(savedWallet);
        } else {
          setSelectedWallet(validWallets[0]);
          await AsyncStorage.setItem('selectedWalletId', String(validWallets[0].id));
        }
      } else if (validWallets.length > 0) {
        setSelectedWallet(validWallets[0]);
        await AsyncStorage.setItem('selectedWalletId', String(validWallets[0].id));
      }
    } catch (error) {
      console.error('【钱包上下文】加载钱包失败:', error);
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

      // 保存钱包ID到AsyncStorage
      await AsyncStorage.setItem('selectedWalletId', String(wallet.id));
      console.log('保存选中的钱包ID:', wallet.id);
      
      // 使用Promise确保状态更新的顺序
      await new Promise(resolve => {
        setTokens([]);
        setTimeout(() => {
          setSelectedWallet(wallet);
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
      setWallets(response);
      return response;
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
    getTokensCache
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