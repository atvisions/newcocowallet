import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = '@coco_wallet_device_id';
const DEVICE_ID_BACKUP_KEY = '@device_id_backup';
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
      
      const backupId = await AsyncStorage.getItem(DEVICE_ID_BACKUP_KEY);
      const legacyId = await AsyncStorage.getItem('deviceId');
      
      if (backupId || legacyId) {
        const recoveredId = backupId || legacyId;
        console.log('【COCO_DEVICE】从备用/旧键名恢复设备ID:', recoveredId);
        
        await AsyncStorage.setItem(DEVICE_ID_KEY, recoveredId);
        await AsyncStorage.setItem(DEVICE_ID_BACKUP_KEY, recoveredId);
        await AsyncStorage.setItem('deviceId', recoveredId);
        
        return recoveredId;
      }
      
      const newDeviceId = `android_${uuidv4()}`;
      console.log('【COCO_DEVICE】生成新设备ID:', newDeviceId);
      
      await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
      await AsyncStorage.setItem(DEVICE_ID_BACKUP_KEY, newDeviceId);
      await AsyncStorage.setItem('deviceId', newDeviceId);
      
      const verifyId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      console.log('【COCO_DEVICE】验证存储的设备ID:', verifyId);
      
      return newDeviceId;
    } catch (error) {
      console.error('【COCO_DEVICE】获取设备ID失败:', error);
      
      try {
        const backupId = await AsyncStorage.getItem(DEVICE_ID_BACKUP_KEY);
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
      await AsyncStorage.setItem(DEVICE_ID_BACKUP_KEY, deviceId);
      await AsyncStorage.setItem('deviceId', deviceId);
      
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
      const keyNames = [
        DEVICE_ID_KEY,
        DEVICE_ID_BACKUP_KEY,
        'deviceId'
      ];
      
      let effectiveId = null;
      let foundKeyName = null;
      
      for (const key of keyNames) {
        const id = await AsyncStorage.getItem(key);
        if (id) {
          effectiveId = id;
          foundKeyName = key;
          break;
        }
      }
      
      console.log('【COCO_DEVICE】ID检查结果:', 
        effectiveId ? `在键 "${foundKeyName}" 找到ID: ${effectiveId}` : '未找到有效ID');
      
      if (effectiveId) {
        for (const key of keyNames) {
          await AsyncStorage.setItem(key, effectiveId);
        }
        return effectiveId;
      }
      
      return await this.getDeviceId();
    } catch (error) {
      console.error('【COCO_DEVICE】确保设备ID失败:', error);
      return await this.getDeviceId();
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