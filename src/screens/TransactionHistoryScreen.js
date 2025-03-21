import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { debounce } from 'lodash';
import { DeviceManager } from '../utils/DeviceManager';
import { api } from '../services/api';

const TransactionHistoryScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const FETCH_COOLDOWN = 10000; // 10秒冷却时间

  // 使用防抖函数
  const debouncedFetchTransactions = useCallback(
    debounce(async (force = false) => {
      // 如果不是强制刷新，且距离上次请求不足10秒，则跳过
      if (!force && Date.now() - lastFetchTime < FETCH_COOLDOWN) {
        console.log('跳过请求，冷却中...');
        return;
      }
      
      try {
        setIsLoading(true);
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.getTokenTransfers(
          selectedWallet.id,
          deviceId,
          page,
          pageSize
        );
        
        if (response.status === 'success') {
          setTransactions(response.data.transactions);
          setLastFetchTime(Date.now());
        }
      } catch (error) {
        console.error('获取交易记录失败:', error);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [selectedWallet?.id, page, pageSize]
  );

  // 使用 useFocusEffect 而不是 useEffect
  useFocusEffect(
    useCallback(() => {
      // 页面获得焦点时加载数据
      debouncedFetchTransactions();
      
      // 不要设置自动刷新定时器
      return () => {
        // 清理工作
      };
    }, [debouncedFetchTransactions])
  );

  // 添加手动刷新功能
  const handleRefresh = () => {
    debouncedFetchTransactions(true); // 强制刷新
  };

  return (
    // Rest of the component code...
  );
};

export default TransactionHistoryScreen; 