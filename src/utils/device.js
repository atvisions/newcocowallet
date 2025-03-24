import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'deviceId';
const WALLET_CREATED_KEY = '@coco_wallet_created';

export const DeviceManager = {
  async getDeviceId() {
    try {
      console.log('【COCO_DEVICE】开始获取设备ID');
      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      console.log('【COCO_DEVICE】从存储获取的设备ID:', deviceId);
      
      if (deviceId) {
        return deviceId;
      }
      
      const newDeviceId = `android_${uuidv4()}`;
      console.log('【COCO_DEVICE】生成新设备ID:', newDeviceId);
      
      await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
      
      const verifyId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      console.log('【COCO_DEVICE】验证存储的设备ID:', verifyId);
      
      if (!verifyId) {
        console.error('【COCO_DEVICE】设备ID存储失败，将尝试备用存储');
        await AsyncStorage.setItem('@device_id_backup', newDeviceId);
      }
      
      return newDeviceId;
    } catch (error) {
      console.error('【COCO_DEVICE】获取设备ID失败:', error);
      
      try {
        const backupId = await AsyncStorage.getItem('@device_id_backup');
        if (backupId) {
          console.log('【COCO_DEVICE】从备用存储恢复设备ID:', backupId);
          return backupId;
        }
      } catch (backupError) {
        console.error('【COCO_DEVICE】备用恢复失败:', backupError);
      }
      
      return 'android_fallback_' + Date.now();
    }
  },

  async saveDeviceId(deviceId) {
    try {
      if (!deviceId) {
        throw new Error('Cannot save empty device ID');
      }
      
      console.log('【COCO_DEVICE】手动保存设备ID:', deviceId);
      
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      await AsyncStorage.setItem('@device_id_backup', deviceId);
      
      const savedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      console.log('【COCO_DEVICE】验证手动保存的ID:', savedId);
      
      return savedId === deviceId;
    } catch (error) {
      console.error('【COCO_DEVICE】手动保存设备ID失败:', error);
      return false;
    }
  },

  async ensureDeviceId() {
    try {
      const mainId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      
      const backupId = await AsyncStorage.getItem('@device_id_backup');
      
      const oldId = await AsyncStorage.getItem('@coco_wallet_device_id');
      
      console.log('【COCO_DEVICE】ID检查 - 主要:', mainId, '备用:', backupId, '旧格式:', oldId);
      
      const effectiveId = mainId || backupId || oldId;
      
      if (effectiveId) {
        if (!mainId) {
          await AsyncStorage.setItem(DEVICE_ID_KEY, effectiveId);
          console.log('【COCO_DEVICE】从其他位置恢复ID并保存:', effectiveId);
        }
        return effectiveId;
      }
      
      return this.getDeviceId();
    } catch (error) {
      console.error('【COCO_DEVICE】确保设备ID失败:', error);
      return this.getDeviceId();
    }
  },

  generateDeviceId() {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    return `${platform}_${uuidv4()}`;
  },

  async setWalletCreated(isCreated) {
    try {
      await AsyncStorage.setItem(WALLET_CREATED_KEY, JSON.stringify(isCreated));
    } catch (error) {
      console.error('Error saving wallet status:', error);
      throw error;
    }
  },

  async hasWalletCreated() {
    try {
      console.log('[DeviceManager] Checking wallet created status...');
      const status = await AsyncStorage.getItem(WALLET_CREATED_KEY);
      console.log('[DeviceManager] Wallet created status:', status === 'true');
      return status === 'true';
    } catch (error) {
      console.error('[DeviceManager] Error checking wallet status:', error);
      return false;
    }
  },

  async setChainType(chainType) {
    await AsyncStorage.setItem('chainType', chainType);
  },

  async getChainType() {
    return await AsyncStorage.getItem('chainType') || 'evm';
  },

  async setPaymentPasswordStatus(hasPassword) {
    try {
      const status = hasPassword === true ? 'true' : 'false';
      await AsyncStorage.setItem('@payment_password_status', status);
    } catch (error) {
      console.error('[DeviceManager] Error setting payment password status:', error);
      throw error;
    }
  },

  async getPaymentPasswordStatus() {
    try {
      const status = await AsyncStorage.getItem('@payment_password_status');
      return status === 'true';
    } catch (error) {
      console.error('[DeviceManager] Error getting payment password status:', error);
      return false;
    }
  }
};