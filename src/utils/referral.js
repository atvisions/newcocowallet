import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

export const getReferralInfo = async () => {
  try {
    const referralInfo = await AsyncStorage.getItem('referral_info');
    return referralInfo ? JSON.parse(referralInfo) : null;
  } catch (error) {
    console.error('Failed to get referral info:', error);
    return null;
  }
};

export const clearReferralInfo = async () => {
  try {
    await AsyncStorage.removeItem('referral_info');
  } catch (error) {
    console.error('Failed to clear referral info:', error);
  }
};

export const saveReferralInfo = async (ref_code, temp_id) => {
  try {
    const referralInfo = {
      ref_code,
      temp_id,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem('referral_info', JSON.stringify(referralInfo));
    return true;
  } catch (error) {
    console.error('Failed to save referral info:', error);
    return false;
  }
};

export const verifySignature = (params) => {
  try {
    const { sign, ...data } = params;
    
    // 按键排序
    const sortedParams = Object.keys(data)
      .sort()
      .reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {});
    
    // 构建签名字符串
    const signStr = Object.entries(sortedParams)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    
    // 计算签名
    const calculatedSign = CryptoJS.HmacSHA256(
      signStr,
      '7fedd4558bc93349105de9b05b86c3ac58fa51eb516ced7dddd563b63c3f25c1'
    ).toString();
    
    return calculatedSign === sign;
  } catch (error) {
    console.error('Failed to verify signature:', error);
    return false;
  }
};

const VISIT_RECORDED_KEY = 'visit_recorded_';

const hasVisitRecorded = async (refCode) => {
  try {
    const key = VISIT_RECORDED_KEY + refCode;
    const recorded = await AsyncStorage.getItem(key);
    return recorded === 'true';
  } catch (error) {
    return false;
  }
};

const markVisitRecorded = async (refCode) => {
  try {
    const key = VISIT_RECORDED_KEY + refCode;
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('Failed to mark visit:', error);
  }
}; 