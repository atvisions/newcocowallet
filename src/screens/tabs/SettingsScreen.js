import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import Constants from 'expo-constants';
import { useWallet } from '../../contexts/WalletContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen({ navigation }) {
  const [hasPaymentPassword, setHasPaymentPassword] = useState(false);
  const { selectedWallet, setSelectedWallet, wallets } = useWallet();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }, [])
  );

  // 在组件加载时检查支付密码状态
  useEffect(() => {
    checkPaymentPasswordStatus();
  }, []);

  // 每次页面获得焦点时重新检查状态
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkPaymentPasswordStatus();
    });

    return unsubscribe;
  }, [navigation]);

  const checkPaymentPasswordStatus = async () => {
    console.log('Checking payment password status...');
    try {
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.checkPaymentPasswordStatus(deviceId);
      console.log('Payment password status:', response);  // 添加日志
      setHasPaymentPassword(response || false);
    } catch (error) {
      console.error('Check payment password error:', error);
      setHasPaymentPassword(false);
    }
  };

  const handleSetPaymentPassword = () => {
    if (hasPaymentPassword) {
      navigation.navigate('ChangePaymentPassword');
    } else {
      navigation.navigate('SetPassword', { type: 'payment' });
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // 如果无法返回，则重置到主页面
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  // 处理钱包管理
  const handleWalletManagement = () => {
    navigation.navigate('WalletManagement');
  };

  // 处理安全设置
  const handleSecuritySettings = () => {
    navigation.navigate('SecuritySettings');
  };

  // 处理语言设置
  const handleLanguageSettings = () => {
    navigation.navigate('LanguageSettings');
  };

  // 处理通知设置
  const handleNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  // 处理帮助与支持
  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  // 处理关于我们
  const handleAboutUs = () => {
    navigation.navigate('AboutUs');
  };

  // 处理服务条款
  const handleTermsOfService = () => {
    navigation.navigate('TermsOfService');
  };

  // 处理隐私政策
  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  // 处理退出登录
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // 清除本地存储的登录状态
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('selectedWallet');
              
              // 重置钱包状态
              setSelectedWallet(null);
              
              // 导航到登录页面
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 渲染设置项
  const renderSettingItem = (icon, title, onPress, showDivider = true) => (
    <>
      <TouchableOpacity style={styles.settingItem} onPress={onPress}>
        <View style={styles.settingIconContainer}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
        <Ionicons name="chevron-forward" size={20} color="#8E8E8E" />
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2C2941', '#171C32']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent 
      />
      <View style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.walletSelector}
            onPress={() => navigation.navigate('WalletSelector')}
          >
            <Image 
              source={{ uri: selectedWallet?.avatar }} 
              style={styles.walletAvatar} 
            />
            <Text style={styles.walletName}>{selectedWallet?.name}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E8E" />
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleSetPaymentPassword}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#1FC595' }]}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemText}>
                  {hasPaymentPassword ? 'Change Payment Password' : 'Set Payment Password'}
                </Text>
              </View>
              <View style={styles.menuItemRight}>
                {hasPaymentPassword && (
                  <View style={styles.checkmarkContainer}>
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#8E8E8E" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#5856D6' }]}>
                  <Ionicons name="information" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemText}>Version</Text>
              </View>
              <Text style={styles.versionText}>
                {Constants.expoConfig.version}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#8E8E8E',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#272C52',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
  },
  walletSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  walletName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(44, 41, 65, 0.8)',
  },
  settingTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginLeft: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});