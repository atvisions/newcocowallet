// 应用主题颜色
export const colors = {
  primary: '#1FC595',
  secondary: '#4A6FFF',
  background: '#171C32',
  card: '#1E2338',
  text: '#FFFFFF',
  textSecondary: '#8E8E8E',
  border: '#2A3146',
  notification: '#FF4B55',
  success: '#1FC595',
  warning: '#FFB800',
  error: '#FF4B55',
  inactive: '#5A6081',
};

// 字体大小
export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  title: 28,
};

// 间距
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// 圆角
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

// 阴影
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
};

// 渐变
export const gradients = {
  primary: ['#1FC595', '#0D9B7A'],
  secondary: ['#4A6FFF', '#2E4FCC'],
  danger: ['#FF4B55', '#CC3C44'],
  warning: ['#FFB800', '#CC9300'],
  dark: ['#171C32', '#0D1020'],
};

export default {
  colors,
  fontSizes,
  spacing,
  borderRadius,
  shadows,
  gradients,
}; 