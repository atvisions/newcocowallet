import axios from 'axios';
import { DeviceManager } from '../utils/device';
import { logger } from '../utils/logger';

// 确保 BASE_URL 是正确的
const BASE_URL = 'https://api.cocowallet.io/api/v1';

// 创建 axios 实例
const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,  // 增加超时时间到60秒
  headers: {
    'Content-Type': 'application/json',
  }
});

// 修改响应拦截器
instance.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // 直接返回服务器的错误响应
      return Promise.reject(error.response.data || {
        status: 'error',
        message: 'An error occurred'
      });
    } else if (error.request) {
      return Promise.reject({
        status: 'error',
        message: 'Network error, please check your connection'
      });
    } else {
      return Promise.reject({
        status: 'error',
        message: 'Request failed'
      });
    }
  }
);

// 修改链路径配置
const CHAIN_PATHS = {
  sol: 'solana',
  solana: 'solana',
  eth: 'evm',
  evm: 'evm',
  base: 'evm',  // 添加 BASE 链映射
  BASE: 'evm'   // 添加大写映射
};

// 修改获取链路径的辅助函数
const getChainPath = (chain) => {
  const chainKey = chain?.toLowerCase();
  const path = CHAIN_PATHS[chainKey];
  if (!path) {
    return 'evm';  // 默认返回 evm
  }
  return path;
};

// 统一的错误处理函数
const handleApiError = (error, defaultMessage) => {
  if (error.status === 'error') {
    return error;  // 如果已经是格式化的错误，直接返回
  }
  return {
    status: 'error',
    message: defaultMessage
  };
};

export const api = {
  async setPaymentPassword(deviceId, password, confirmPassword, useBiometric = false) {
    try {
      const response = await instance.post('/wallets/set_password/', {
        device_id: deviceId,
        payment_password: password,
        payment_password_confirm: confirmPassword,
        use_biometric: useBiometric
      });
      // 设置密码成功后，更新本地状态
      await DeviceManager.setPaymentPasswordStatus(true);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getSupportedChains() {
    try {
      const response = await instance.get('/wallets/get_supported_chains/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async selectChain(deviceId, chain) {
    try {
      const response = await instance.post('/wallets/select_chain/', {
        device_id: deviceId,
        chain
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async verifyMnemonic(deviceId, chain, mnemonic, chainType) {
    const response = await instance.post('/wallets/verify_mnemonic/', {
      device_id: deviceId,
      chain,
      mnemonic
    });
    
    if (!response.data) {
      throw new Error('Failed to verify mnemonic');
    }
    
    return response.data;
  },

  async getWallets(deviceId) {
    try {
      const response = await instance.get(`/wallets/?device_id=${deviceId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to get wallets');
    }
  },

  async renameWallet(walletId, deviceId, newName) {
    try {
      const response = await instance.post(`/wallets/${walletId}/rename_wallet/`, {
        device_id: deviceId,
        new_name: newName
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteWallet(walletId, deviceId, paymentPassword) {
    try {
      const response = await instance.post(`/wallets/${walletId}/delete_wallet/`, {
        device_id: deviceId,
        payment_password: paymentPassword
      });
      return response.data;
    } catch (error) {
      // 不再直接返回错误对象，而是返回标准格式的响应
      return {
        status: 'error',
        message: error.response?.data?.message || 'Incorrect password'
      };
    }
  },

  async changePaymentPassword(deviceId, oldPassword, newPassword, confirmPassword) {
    try {
      const response = await instance.post('/wallets/change_password/', {
        device_id: deviceId,
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return response.data;
    } catch (error) {
      // 不再抛出错误，而是返回错误状态
      return {
        status: 'error',
        message: error.response?.data?.message || 'Failed to change password'
      };
    }
  },

  async checkPaymentPasswordStatus(deviceId) {
    try {
      const response = await instance.get(`/wallets/payment_password/status/${deviceId}/`);
      return response.data?.data?.has_payment_password || false;
    } catch (error) {
      // 返回标准格式的错误响应
      return {
        status: 'error',
        message: error.response?.data?.message || 'Network error, please check your connection',
        hasPassword: false
      };
    }
  },

  async verifyPaymentPassword(deviceId, password) {
    try {
      const response = await instance.post('/wallets/verify_password/', {
        device_id: deviceId,
        payment_password: password
      });
      return response.data;
    } catch (error) {
      // 不再抛出错误，而是返回错误状态
      return {
        status: 'error',
        message: error.response?.data?.message || 'Current password is incorrect'
      };
    }
  },

  async getTokens(deviceId, chain, walletId) {
    try {
      const chainPath = getChainPath(chain);
      const response = await instance.get(`/${chainPath}/wallets/${walletId}/tokens/?device_id=${deviceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getTokenTransfers(deviceId, chain, walletId, page = 1, pageSize = 20) {
    try {
      const chainPath = getChainPath(chain);
      const response = await instance.get(
        `/${chainPath}/wallets/${walletId}/token-transfers/`,
        {
          params: {
            device_id: deviceId,
            page,
            page_size: pageSize
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getNFTCollections(deviceId, chain, walletId) {
    try {
      const chainPath = getChainPath(chain);
      const response = await instance.get(
        `/${chainPath}/nfts/collections/${walletId}/`,
        {
          params: {
            device_id: deviceId,
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getNFTsByCollection(deviceId, chain, walletId, collectionAddress) {
    try {
      const chainPath = getChainPath(chain);
      let url;
      
      if (chain === 'sol') {
        url = `/${chainPath}/nfts/collections/${walletId}/${collectionAddress}/nfts/`;
      } else {
        url = `/${chainPath}/nfts/${walletId}/list/?device_id=${deviceId}&collection_address=${collectionAddress}`;
      }

      if (chain === 'sol') {
        const response = await instance.get(url, {
          params: {
            device_id: deviceId
          }
        });
        return response.data;
      } else {
        const response = await instance.get(url);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  },

  toggleTokenVisibility: async (walletId, tokenAddress, deviceId, chain) => {
    try {
      const chainPath = getChainPath(chain);
      if (!chainPath) {
        return null;
      }

      const response = await instance.post(
        `/${chainPath}/wallets/${walletId}/tokens/toggle-visibility/`,
        {
          token_address: tokenAddress
        },
        {
          params: {
            device_id: deviceId
          }
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTokensManagement: async (walletId, deviceId, chain) => {
    const chainPath = getChainPath(chain);
    try {
      const response = await instance.get(
        `/${chainPath}/wallets/${walletId}/tokens/manage/`,
        {
          params: { device_id: deviceId }
        }
      );
      
      return {
        status: 'success',
        data: response.data
      };
    } catch (error) {
      throw error;
    }
  },

  async getPrivateKey(walletId, deviceId, password) {
    try {
      const response = await instance.post(`/wallets/${walletId}/show_private_key/`, {
        device_id: deviceId,
        payment_password: password
      });
      return response.data;
    } catch (error) {
      // 不再抛出错误，而是返回错误状态对象
      return {
        status: 'error',
        message: error.response?.data?.message || 'Incorrect password'
      };
    }
  },

  getPrivateKeyWithBiometric: async (walletId, deviceId) => {
    try {
      const response = await instance.post(
        `/wallets/${walletId}/show_private_key/biometric/`,
        {
          device_id: deviceId,
        }
      );

      if (response.data?.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to get private key');
      }
    } catch (error) {
      throw error;
    }
  },

  enableBiometric: async (deviceId, paymentPassword) => {
    try {
      const response = await instance.post('/wallets/biometric/enable/', {
        device_id: deviceId,
        payment_password: paymentPassword
      });

      if (response.data?.code === 200) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to enable biometric');
      }
    } catch (error) {
      throw error;
    }
  },

  disableBiometric: async (deviceId) => {
    try {
      const response = await instance.post('/wallets/biometric/disable/', {
        device_id: deviceId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getWalletTokens(deviceId, walletId, chain, signal) {
    try {
      const chainPath = chain.toLowerCase() === 'sol' ? 'solana' : 'evm';
      const url = `${BASE_URL}/${chainPath}/wallets/${walletId}/tokens/`;

      const response = await axios.get(url, {
        params: {
          device_id: deviceId
        },
        headers: {
          'Device-ID': deviceId
        },
        signal
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async importPrivateKey(deviceId, chain, privateKey, password) {
    try {
      const response = await instance.post('/wallets/import_private_key/', {
        device_id: deviceId,
        chain,
        private_key: privateKey,
        payment_password: password
      });
      return response.data;
    } catch (error) {
      return error;
    }
  },

  async sendEvmTransaction(walletId, params) {
    try {
      // 确保params中包含device_id
      if (!params.device_id) {
        throw new Error('Missing device_id parameter');
      }
      
      const response = await instance.post(`/evm/wallets/${walletId}/transfer/`, {
        device_id: params.device_id,
        to_address: params.to_address,
        amount: params.amount,
        payment_password: params.payment_password,
        token_address: params.token === 'native' ? null : params.token,
        gas_limit: params.gas_limit,
        gas_price: params.gas_price,
        max_priority_fee: params.max_priority_fee,
        max_fee: params.max_fee
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async getTransactionStatus(deviceId, txHash, walletId) {
    try {
      const response = await instance.get(
        `/solana/wallets/${walletId}/transaction-status/`,
        {
          params: {
            device_id: deviceId,
            tx_hash: txHash
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          status: 'pending',
          message: 'Transaction is being confirmed, please try again later'
        };
      }
      return {
        status: 'error',
        message: 'Network error, please check your connection'
      };
    }
  },

  async getTokenDetails(deviceId, walletId, symbol) {
    try {
      const response = await instance.get(
        `/solana/wallets/${walletId}/tokens/${symbol}/detail`,
        {
          params: {
            device_id: deviceId
          }
        }
      );
      
      if (response.data?.status === 'success') {
        return {
          status: 'success',
          data: response.data.data
        };
      } else {
        return {
          status: 'error',
          message: response.data?.message || 'Failed to get token details'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: error.response?.data?.message || 'Failed to get token details'
      };
    }
  },

  async getTokenDecimals(deviceId, walletId, tokenAddress) {
    try {
      const response = await this.getTokenDetails(deviceId, walletId, tokenAddress);
      return response.status === 'success' ? response.data.decimals : null;
    } catch (error) {
      return null;
    }
  },

  async sendSolanaTransaction(walletId, params) {
    try {
      const response = await instance.post(
        `/solana/wallets/${walletId}/transfer/`,
        {
          ...params,
          // 确保原生 SOL 转账时不传递 token_address
          ...(params.is_native ? {} : { token_address: params.token_address })
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getSolanaTokenDetail(deviceId, walletId, tokenAddress) {
    try {
      const response = await instance.get(
        `/solana/wallets/${walletId}/tokens/SOL/${tokenAddress}/detail`,
        {
          params: {
            device_id: deviceId
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getTransactionHistory(deviceId, walletId, chain, page = 1, pageSize = 20) {
    try {
      const chainPath = getChainPath(chain);
      const response = await instance.get(
        `/${chainPath}/wallets/${walletId}/token-transfers/`,
        {
          params: {
            device_id: deviceId,
            page,
            page_size: pageSize
          }
        }
      );

      if (response.data?.status === 'success') {
        return {
          status: 'success',
          data: {
            transactions: response.data.data?.transfers || [],
            total: response.data.data?.total || 0,
            page_size: pageSize
          }
        };
      } else {
        return {
          status: 'error',
          message: response.data?.message || 'Failed to get transaction history'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: error.response?.data?.message || 'Network error, please check your connection'
      };
    }
  },

  getRecommendedTokens: async (deviceId, chain, chainPath) => {
    try {
      const response = await instance.get(
        `/${chainPath}/wallets/recommended-tokens/?chain=${chain.toUpperCase()}`
      );
      return response.data;
    } catch (error) {
      return { status: 'success', data: { tokens: [] } }; // 返回空数组而不是抛出错误
    }
  },
  
  async getTokenDetail(deviceId, walletId, symbol, tokenAddress) {
    try {
      const response = await instance.get(
        `/solana/wallets/${walletId}/tokens/${symbol}/${tokenAddress}/detail`,
        {
          params: { device_id: deviceId }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 获取代币K线数据
   * @param {string} deviceId - 设备ID
   * @param {string} walletId - 钱包ID
   * @param {string} tokenAddress - 代币地址
   * @param {Object} params - 查询参数
   * @param {string} params.timeframe - 时间周期 (1h/4h/1d/1w)
   * @param {string} [params.from_date] - 开始日期 (YYYY-MM-DD)
   * @param {string} [params.to_date] - 结束日期 (YYYY-MM-DD)
   * @returns {Promise<Object>} K线数据
   */
  async getTokenOHLCV(deviceId, walletId, tokenAddress, params) {
    try {
      const queryParams = new URLSearchParams({
        device_id: deviceId,
        timeframe: params.timeframe
      });

      if (params.from_date) {
        queryParams.append('from_date', params.from_date);
      }
      if (params.to_date) {
        queryParams.append('to_date', params.to_date);
      }

      const response = await instance.get(
        `/solana/wallets/${walletId}/tokens/${tokenAddress}/ohlcv/?${queryParams.toString()}`
      );

      return response.data;
    } catch (error) {
      return {
        status: 'error',
        data: { ohlcv: [] }
      };
    }
  },

  // Solana Swap 相关接口
  async getSolanaSwapTokens(walletId, deviceId) {
    try {
      const response = await instance.get(
        `/solana/wallets/${walletId}/swap/tokens/`,  // 添加末尾斜杠
        {
          params: {
            device_id: deviceId
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getSolanaTokenPrices(walletId, deviceId, tokenAddresses) {
    try {
      const response = await instance.get(
        `/solana/wallets/${walletId}/swap/prices/`,  // 添加末尾斜杠
        {
          params: {
            device_id: deviceId,
            token_addresses: Array.isArray(tokenAddresses) ? tokenAddresses.join(',') : tokenAddresses
          }
        }
      );
      return response.data;
    } catch (error) {
      return {
        status: 'error',
        data: { prices: {} }
      };
    }
  },

  async getSwapQuote(walletId, params) {
    try {
      // 修改为 GET 请求，与实际接口匹配
      const response = await instance.get(
        `/solana/wallets/${walletId}/swap/quote`,
        {
          params: {
            device_id: params.device_id,
            from_token: params.from_token,
            to_token: params.to_token,
            amount: params.amount,
            slippage: params.slippage
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async executeSolanaSwap(walletId, params) {
    try {
      const numericWalletId = Number(walletId);
      
      const requestBody = {
        device_id: params.device_id,
        from_token: params.from_token,
        to_token: params.to_token,
        amount: params.amount,
        slippage: params.slippage,
        quote_id: typeof params.quote_id === 'string' ? params.quote_id : JSON.stringify(params.quote_id),
        payment_password: params.payment_password
      };

      const response = await instance.post(
        `/solana/wallets/${numericWalletId}/swap/execute/`,
        requestBody
      );

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async getSolanaSwapStatus(walletId, signature, deviceId) {
    try {
      if (!walletId || !signature || !deviceId) {
        throw new Error('Missing required parameters');
      }

      const numericWalletId = Number(walletId);
      if (isNaN(numericWalletId)) {
        throw new Error('Invalid wallet ID');
      }

      // 修改 URL 格式，确保不会有重定向
      const url = `/solana/wallets/${numericWalletId}/swap/status/${signature}`;

      const response = await instance.get(url, {
        params: {
          device_id: deviceId
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: 'error',
        message: error.response?.data?.message || 'Transaction status query failed',
        code: error.response?.data?.code || 'UNKNOWN_ERROR'
      };
    }
  },

  // 添加获取Solana交换费用估算的函数
  async getSolanaSwapEstimateFees(walletId, fromToken, toToken, amount) {
    try {
      if (!walletId || !fromToken || !toToken || !amount) {
        console.error('getSolanaSwapEstimateFees: 缺少必要参数');
        throw new Error('Missing required parameters for fee estimation');
      }
      
      const deviceId = await DeviceManager.getDeviceId();
      const numericWalletId = Number(walletId);
      
      if (isNaN(numericWalletId)) {
        throw new Error('Invalid wallet ID');
      }
      
      console.log('费用估算请求参数:', {
        walletId: numericWalletId,
        fromToken,
        toToken,
        amount,
        deviceId
      });
      
      const response = await instance.get(
        `/solana/wallets/${numericWalletId}/swap/estimate_fees`,
        {
          params: {
            device_id: deviceId,
            from_token: fromToken,
            to_token: toToken,
            amount: amount
          }
        }
      );
      
      console.log('费用估算API响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('费用估算API错误:', error.response?.data || error.message || error);
      return {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to estimate fees',
        data: null
      };
    }
  },

  /**
   * 获取代币市场价格
   * @param {string} deviceId - 设备ID
   * @param {string} walletId - 钱包ID
   * @param {string|string[]} tokenAddresses - 单个代币地址或代币地址数组
   * @returns {Promise<Object>} 代币价格信息，格式为：
   * {
   *   status: 'success',
   *   data: {
   *     prices: {
   *       [tokenAddress]: {
   *         price: number,
   *         price_change_24h: number,
   *         volume_24h: number,
   *         market_cap: number,
   *         total_supply: number,
   *         vs_token: string
   *       }
   *     }
   *   }
   * }
   */
  async getTokenPrices(deviceId, walletId, tokenAddresses) {
    try {
      // 确保 tokenAddresses 是数组
      const addresses = Array.isArray(tokenAddresses) ? tokenAddresses : [tokenAddresses];

      const response = await instance.get(
        `/solana/wallets/${walletId}/swap/prices/`,  // 添加末尾斜杠
        {
          params: {
            device_id: deviceId,
            token_addresses: addresses.join(',')
          }
        }
      );
      
      if (response.data?.status === 'success') {
        return response.data;
      } else {
        return {
          status: 'error',
          data: { prices: {} }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: error.response?.data?.message || 'Failed to get token prices',
        data: { prices: {} }
      };
    }
  },
};

export const setPaymentPassword = async (deviceId, password) => {
    try {
        const response = await fetch(`${BASE_URL}/wallets/set_password/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                device_id: deviceId,
                payment_password: password,
            }),
        });

        const data = await response.json();
        return data; // 确保返回的数据包含 status 和 message
    } catch (error) {
        throw new Error('Failed to save password');
    }
};

export const selectChain = async (deviceId, selectedChain) => {
    const response = await fetch(`${BASE_URL}/select-chain`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            device_id: deviceId,
            chain: selectedChain,
        }),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`API Error Response: ${JSON.stringify(errorResponse)}`);
    }

    return await response.json();
};