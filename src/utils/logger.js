/**
 * 日志工具类
 * 提供统一的日志记录接口，方便后期扩展和管理
 */

// 是否启用调试日志
const DEBUG_ENABLED = true;

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 当前日志级别
const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG;

/**
 * 日志工具类
 */
export const logger = {
  /**
   * 调试日志
   * @param {string} message 日志消息
   * @param {any} data 附加数据
   */
  debug: (message, ...data) => {
    if (DEBUG_ENABLED && CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...data);
    }
  },

  /**
   * 信息日志
   * @param {string} message 日志消息
   * @param {any} data 附加数据
   */
  info: (message, ...data) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.info(`[INFO] ${message}`, ...data);
    }
  },

  /**
   * 警告日志
   * @param {string} message 日志消息
   * @param {any} data 附加数据
   */
  warn: (message, ...data) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, ...data);
    }
  },

  /**
   * 错误日志
   * @param {string} message 日志消息
   * @param {any} data 附加数据
   */
  error: (message, ...data) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, ...data);
    }
  }
};

export default logger; 