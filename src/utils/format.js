import BigNumber from 'bignumber.js';

/**
 * 格式化地址显示
 * @param {string} address - 完整地址
 * @returns {string} - 格式化后的地址
 */
export const formatAddress = (address) => {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * 格式化代币金额显示
 * @param {string|number} amount - 金额（已乘以精度的值）
 * @param {number} decimals - 代币精度
 * @returns {string} - 格式化后的金额
 */
export const formatTokenAmount = (amount, decimals) => {
  if (!amount || !decimals) return '0';
  
  try {
    // 使用 BigNumber 处理精度问题
    const value = new BigNumber(amount).dividedBy(new BigNumber(10).pow(decimals));
    
    // 如果金额为0，直接返回'0'
    if (value.isZero()) return '0';
    
    // 如果金额小于 0.000001，使用科学计数法
    if (value.isLessThan(0.000001) && !value.isZero()) {
      return value.toExponential(6);
    }
    
    // 否则使用标准格式，最多显示 6 位小数
    return value.toFormat(6, {
      groupSeparator: ',',
      decimalSeparator: '.',
      groupSize: 3,
      secondaryGroupSize: 0
    }).replace(/\.?0+$/, ''); // 移除末尾的零和小数点
  } catch (error) {
    console.error('格式化代币金额错误:', error);
    return '0';
  }
};

/**
 * 格式化金额显示
 * @param {string|number} amount - 金额
 * @param {number} decimals - 小数位数
 * @returns {string} - 格式化后的金额
 */
export const formatAmount = (amount, decimals = 4) => {
  if (!amount) return '0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  
  // 如果数值为0，直接返回'0'
  if (num === 0) return '0';
  
  // 对于小于0.0001的数值，保留更多小数位以显示实际值
  if (num < 0.0001 && num > 0) {
    return num.toFixed(Math.min(8, decimals));
  }
  
  if (num >= 1000000) {
    const formatted = num.toLocaleString('en-US', { maximumFractionDigits: decimals });
    return formatted.replace(/\.?0+$/, '');
  }
  
  // 格式化数值并移除末尾的0
  const formatted = num.toFixed(decimals);
  return formatted.replace(/\.?0+$/, '') || '0';
};

/**
 * 格式化 USD 价值显示
 * @param {string|number} value - USD 价值
 * @returns {string} - 格式化后的 USD 价值
 */
export const formatUSDValue = (value) => {
  if (!value) return '$0.00';
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};