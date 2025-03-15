import { Image } from 'react-native';

const API_BASE_URL = 'https://api.cocowallet.io';

// 添加处理过的钱包数据缓存
const processedWalletsCache = new Map();
const avatarCache = new Map();

/**
 * 处理钱包数据，确保头像URL格式正确
 * @param {Object} wallet - 钱包对象
 * @returns {Object} - 处理后的钱包对象
 */
export const processWalletData = (wallet) => {
  if (!wallet) return null;
  
  // 检查缓存
  const cacheKey = `${wallet.id}_${wallet.avatar || ''}`;
  if (processedWalletsCache.has(cacheKey)) {
    return processedWalletsCache.get(cacheKey);
  }
  
  const processedWallet = { ...wallet };
  
  // 处理头像URL
  if (processedWallet.avatar) {
    if (processedWallet.avatar.startsWith('http')) {
      // 如果是完整的URL，检查是否需要替换本地开发URL
      if (processedWallet.avatar.includes('192.168.') || processedWallet.avatar.includes('localhost')) {
        const defaultAvatarIndex = (processedWallet.id % 8) + 1;
        processedWallet.avatar = `${API_BASE_URL}/media/wallet_avatars/wallet_avatar_${defaultAvatarIndex}.png`;
      }
    } else {
      // 如果是相对路径，添加基础URL
      processedWallet.avatar = `${API_BASE_URL}${processedWallet.avatar}`;
    }
  } else {
    // 如果没有头像，使用默认头像
    const defaultAvatarIndex = (processedWallet.id % 8) + 1;
    processedWallet.avatar = `${API_BASE_URL}/media/wallet_avatars/wallet_avatar_${defaultAvatarIndex}.png`;
  }

  // 存入缓存
  processedWalletsCache.set(cacheKey, processedWallet);
  
  console.log('【钱包工具】处理钱包数据:', {
    walletId: processedWallet.id,
    avatarUrl: processedWallet.avatar,
    fromCache: false
  });
  
  return processedWallet;
};

/**
 * 处理钱包列表数据
 * @param {Array} wallets - 钱包列表
 * @returns {Array} - 处理后的钱包列表
 */
export const processWalletList = (wallets) => {
  if (!Array.isArray(wallets)) return [];
  
  const processedWallets = wallets.map(processWalletData).filter(Boolean);
  
  console.log('【钱包工具】处理钱包列表:', {
    originalCount: wallets.length,
    processedCount: processedWallets.length
  });
  
  return processedWallets;
};

/**
 * 预加载钱包头像
 * @param {Object} wallet - 钱包对象
 * @returns {Promise} - 预加载结果
 */
export const preloadWalletAvatar = async (wallet) => {
  if (!wallet?.avatar) return false;
  
  // 检查缓存
  if (avatarCache.has(wallet.avatar)) {
    console.log('【钱包工具】使用缓存的头像:', {
      walletId: wallet.id,
      avatarUrl: wallet.avatar
    });
    return true;
  }
  
  try {
    console.log('【钱包工具】预加载头像:', {
      walletId: wallet.id,
      avatarUrl: wallet.avatar
    });
    
    await Image.prefetch(wallet.avatar);
    avatarCache.set(wallet.avatar, true);
    return true;
  } catch (error) {
    console.error('【钱包工具】预加载头像失败:', {
      walletId: wallet.id,
      error: error.message
    });
    return false;
  }
};

/**
 * 清除钱包数据缓存
 * @param {number} walletId - 钱包ID，如果不提供则清除所有缓存
 */
export const clearWalletCache = (walletId) => {
  if (walletId) {
    // 清除特定钱包的缓存
    for (const key of processedWalletsCache.keys()) {
      if (key.startsWith(`${walletId}_`)) {
        processedWalletsCache.delete(key);
      }
    }
    console.log('【钱包工具】已清除钱包缓存:', walletId);
  } else {
    // 清除所有缓存
    processedWalletsCache.clear();
    avatarCache.clear();
    console.log('【钱包工具】已清除所有钱包缓存');
  }
};

/**
 * 获取钱包的默认头像URL
 * @param {number} walletId - 钱包ID
 * @returns {string} - 默认头像URL
 */
export const getDefaultAvatarUrl = (walletId) => {
  const defaultAvatarIndex = (walletId % 8) + 1;
  return `${API_BASE_URL}/media/wallet_avatars/wallet_avatar_${defaultAvatarIndex}.png`;
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