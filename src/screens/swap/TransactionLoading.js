import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

const TransactionLoading = ({ route }) => {
  const { fromSymbol, toSymbol } = route.params || {};
  
  // 简化后的组件不需要执行实际的交易逻辑
  // 所有的交易逻辑都将在 SwapScreen 中处理
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>处理中</Text>
        <Text style={styles.subtitle}>
          正在处理您的 {fromSymbol} 到 {toSymbol} 的兑换交易
        </Text>
        <Text style={styles.description}>
          请稍候，这可能需要一些时间...
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    color: colors.text,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    color: colors.error,
  },
});

export default TransactionLoading;