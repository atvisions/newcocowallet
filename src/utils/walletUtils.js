import { Image } from 'react-native';
import { api } from '../services/api';

/**
 * 处理钱包数据，返回原始头像URL
 * @param {Object} wallet - 钱包对象
 * @returns {Object} - 处理后的钱包对象
 */
export const processWalletData = (wallet) => {
  if (!wallet) {
    console.log('【钱包处理】收到空钱包数据');
    return wallet;
  }
  
  console.log('【钱包处理】处理前的钱包数据:', {
    id: wallet.id,
    name: wallet.name,
    avatar: wallet.avatar
  });
  
  // 直接返回原始钱包数据，不做URL处理
  return wallet;
};

/**
 * 处理钱包列表数据
 * @param {Array} wallets - 钱包列表
 * @returns {Array} - 处理后的钱包列表
 */
export const processWalletList = (wallets) => {
  if (!Array.isArray(wallets)) return [];
  return wallets.map(processWalletData);
};

/**
 * 预加载钱包头像
 * @param {Object} wallet - 钱包对象
 */
export const preloadWalletAvatar = async (wallet) => {
  if (!wallet?.avatar) return;
  
  try {
    await Image.prefetch(wallet.avatar);
  } catch (err) {
    console.warn(`Failed to prefetch wallet avatar for ${wallet.id}:`, err);
  }
};

/**
 * 获取钱包链类型
 * @param {Object} wallet - 钱包对象
 * @returns {string} - 链类型
 */
export const getWalletChainType = (wallet) => {
  if (!wallet) return '';
  return (wallet.chain || '').toUpperCase();
};

/**
 * 检查是否为EVM链
 * @param {string} chainType - 链类型
 * @returns {boolean} - 是否为EVM链
 */
export const isEVMChain = (chainType) => {
  const type = (chainType || '').toUpperCase();
  return type === 'ETH' || type === 'EVM' || type === 'BASE';
};