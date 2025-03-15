import { useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { api } from '../services/api';
import { DeviceManager } from '../utils/device';

export const useWalletNavigation = (navigation) => {
  useEffect(() => {
    const checkWallets = async () => {
      try {
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.getWallets(deviceId);
        const walletsArray = Array.isArray(response) ? response : [];
        
        if (walletsArray.length === 0) {
          await DeviceManager.setWalletCreated(false);
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }]
            })
          );
        }
      } catch (error) {
        console.error('Error checking wallets:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', checkWallets);
    return unsubscribe;
  }, [navigation]);
}; 