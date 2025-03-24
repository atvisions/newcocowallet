import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  ActivityIndicator,
  Modal,
  Share,
  Clipboard,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import Constants from 'expo-constants';
import { useWallet } from '../../contexts/WalletContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import Toast, { ToastView } from '../../components/Toast';
import * as Linking from 'expo-linking';
import { processWalletData } from '../../utils/walletUtils';
import defaultTokenImage from '../../../assets/default-token.png';

// Add this constant - increment it with each OTA update
const BUILD_NUMBER = "1"; // This can be updated with OTA updates

// Custom update modal component
const UpdateModal = ({ visible, onLater, onUpdate }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onLater}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.modalGradient}
          >
            <Image 
              source={require('../../../assets/icon-adaptive.png')} 
              style={styles.updateIcon} 
              resizeMode="contain"
            />
            
            <Text style={styles.updateTitle}>Update Available</Text>
            <Text style={styles.updateMessage}>
              A new version is available with new features and improvements.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.laterButton]} 
                onPress={onLater}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.updateButton]} 
                onPress={onUpdate}
              >
                <LinearGradient
                  colors={['#4A6FFF', '#2E5BFF']}
                  style={styles.updateButtonGradient}
                >
                  <Text style={styles.updateButtonText}>Update Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// Update complete modal component
const UpdateCompleteModal = ({ visible, onRestart }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.modalGradient}
          >
            <Image 
              source={require('../../../assets/icon-adaptive.png')} 
              style={styles.updateIcon} 
              resizeMode="contain"
            />
            
            <Text style={styles.updateTitle}>Update Complete</Text>
            <Text style={styles.updateMessage}>
              The new version has been downloaded. Restart to apply the update.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.updateButton, {width: '100%'}]} 
                onPress={onRestart}
              >
                <LinearGradient
                  colors={['#4A6FFF', '#2E5BFF']}
                  style={styles.updateButtonGradient}
                >
                  <Text style={styles.updateButtonText}>Restart Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// No updates modal component
const NoUpdatesModal = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.modalGradient}
          >
            <View style={[styles.iconContainer, { width: 60, height: 60, backgroundColor: '#1FC595', marginBottom: 16 }]}>
              <Ionicons name="checkmark" size={30} color="#FFFFFF" />
            </View>
            
            <Text style={styles.updateTitle}>You're Up to Date</Text>
            <Text style={styles.updateMessage}>
              You're already using the latest version of the app.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.updateButton, {width: '100%'}]} 
                onPress={onClose}
              >
                <LinearGradient
                  colors={['#4A6FFF', '#2E5BFF']}
                  style={styles.updateButtonGradient}
                >
                  <Text style={styles.updateButtonText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// 优化积分详情模态框
const PointsInfoModal = ({ visible, onClose }) => {
  const rewardItems = [
    {
      id: 'invite',
      icon: 'person-add-outline',
      title: 'Invite friends to download',
      points: 5,
      color: '#4A6FFF'
    },
    {
      id: 'wallet',
      icon: 'wallet-outline',
      title: 'Friend creates a wallet',
      points: 5,
      color: '#F7B84B'
    }
  ];

  const benefitItems = [
    {
      id: 'airdrop',
      icon: 'airplane-outline',
      title: 'Exclusive Airdrops',
      color: '#1FC595'
    },
    {
      id: 'ai',
      icon: 'flash-outline',
      title: 'AI Token Rewards',
      color: '#FF6B6B'
    }
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pointsInfoModalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.pointsInfoGradient}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <FontAwesome name="star" size={18} color="#F7B84B" style={{marginRight: 8}} />
                <Text style={styles.modalTitle}>Coco Points</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#8E8E8E" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pointsInfoContent}>
              <Text style={styles.infoSectionTitle}>How to Earn Points</Text>
              
              {rewardItems.map(item => (
                <View key={item.id} style={styles.rewardRow}>
                  <View style={styles.rewardLeftContent}>
                    <Ionicons name={item.icon} size={18} color={item.color} style={{marginRight: 8}} />
                    <Text style={styles.rewardText}>{item.title}</Text>
                  </View>
                  <View style={styles.pointsContainer}>
                    <Text style={[styles.pointsText, {color: item.color}]}>+{item.points}</Text>
                  </View>
                </View>
              ))}
              
              <Text style={[styles.infoSectionTitle, {marginTop: 20}]}>Point Benefits</Text>
              
              <View style={styles.benefitsRow}>
                {benefitItems.map(item => (
                  <View key={item.id} style={styles.benefitItem}>
                    <Ionicons name={item.icon} size={20} color={item.color} style={{marginBottom: 6}} />
                    <Text style={styles.benefitText}>{item.title}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={[styles.infoSectionTitle, {marginTop: 20}]}>Points Policy</Text>
              <Text style={styles.policyText}>
                • Points are awarded automatically when referrals complete required actions.
              </Text>
              <Text style={styles.policyText}>
                • Each referral counts only once for each reward type.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={onClose}
            >
              <LinearGradient
                colors={['#4A6FFF', '#2E5BFF']}
                style={styles.doneButtonGradient}
              >
                <Text style={styles.doneButtonText}>Got It</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// 修改 ShareLinkItem 组件，并整合积分显示
const PointsAndReferralCard = ({ 
  setPointsInfoModalVisible, 
  navigation, 
  externalUserPoints,
  refreshing,
  forceRefresh
}) => {
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [avatarError, setAvatarError] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [forceRefresh]);

  // 当外部传入积分值变化时更新内部状态
  useEffect(() => {
    if (externalUserPoints !== null && externalUserPoints !== undefined) {
      setUserPoints(externalUserPoints);
    }
  }, [externalUserPoints]);

  const loadData = async () => {
    try {
      setIsLoadingPoints(true);
      const deviceId = await DeviceManager.getDeviceId();
      
      // 获取用户积分
      if (externalUserPoints === null || externalUserPoints === undefined) {
        const pointsResponse = await api.getPoints(deviceId);
        if (pointsResponse.status === 'success') {
          setUserPoints(pointsResponse.data.total_points || 0);
        }
      }
      
      // 获取推荐链接 - 使用后端返回的完整链接
      const linkResponse = await api.getLink(deviceId);
      if (linkResponse.status === 'success') {
        // 直接使用后端返回的完整链接
        setReferralLink(linkResponse.data.full_link || '');
        console.log('获取到推荐链接:', linkResponse.data.full_link);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoadingPoints(false);
    }
  };
  
  // 复制到剪贴板并显示成功图标
  const copyToClipboard = () => {
    if (!referralLink) return;
    
    Clipboard.setString(referralLink);
    setCopiedSuccess(true);
    
    // 2秒后重置图标
    setTimeout(() => {
      setCopiedSuccess(false);
    }, 2000);
  };
  
  // 分享链接
  const handleShareReferralLink = async () => {
    if (!referralLink) return;
    
    try {
      await Share.share({
        message: `Download Coco Wallet and get bonus points! ${referralLink}`,
        url: referralLink, // iOS only
        title: 'Coco Wallet Referral'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };
  
  return (
    <LinearGradient
      colors={['#2E2C46', '#1A1C2E']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.pointsReferralCard}
    >
      {/* 上半部分：积分展示 */}
      <TouchableOpacity 
        style={styles.pointsSection}
        onPress={() => navigation.navigate('PointsHistory')}
      >
        <View style={styles.pointsHeader}>
          <View style={styles.pointsTitleContainer}>
            <FontAwesome name="star" size={16} color="#F7B84B" style={{marginRight: 8}} />
            <Text style={styles.pointsCardTitle}>Coco Points</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setPointsInfoModalVisible(true)}
            style={styles.infoButton}
          >
            <Ionicons name="information-circle-outline" size={20} color="#8E8E8E" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.pointsValueContainer}>
          <View style={styles.pointsValueWrapper}>
            {isLoadingPoints || refreshing ? (
              <ActivityIndicator size="small" color="#F7B84B" />
            ) : (
              <Text style={styles.pointsValueText}>{userPoints}</Text>
            )}
          </View>
          <View style={styles.viewHistoryButton}>
            <Text style={styles.viewHistoryText}>View History</Text>
            <Ionicons name="chevron-forward" size={14} color="#4A6FFF" />
          </View>
        </View>
      </TouchableOpacity>
      
      {/* 分隔线 */}
      <View style={styles.divider} />
      
      {/* 下半部分：分享链接 */}
      <View style={styles.referralSection}>
        <View style={styles.linkContainer}>
          <Ionicons name="link" size={16} color="#8E8E8E" style={{marginRight: 8}} />
          <Text 
            style={styles.linkText}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {isLoadingPoints ? '...' : referralLink}
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={copyToClipboard}
            style={styles.actionButton}
          >
            {copiedSuccess ? (
              <Ionicons name="checkmark-sharp" size={18} color="#1FC595" />
            ) : (
              <Ionicons name="copy-outline" size={18} color="#4A6FFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleShareReferralLink}
            style={styles.actionButton}
          >
            <Ionicons name="share-social-outline" size={18} color="#1FC595" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { wallets, loadWallets, selectedWallet } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [userPoints, setUserPoints] = useState(null);
  const [hasPaymentPassword, setHasPaymentPassword] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const insets = useSafeAreaInsets();
  const [pointsInfoModalVisible, setPointsInfoModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 添加这个状态来跟踪处理后的钱包数据
  const [processedWallet, setProcessedWallet] = useState(null);

  // 添加useEffect来处理钱包数据
  useEffect(() => {
    if (selectedWallet) {
      const processed = processWalletData(selectedWallet);
      setProcessedWallet(processed);
      console.log('处理后的钱包头像URL:', processed.avatar);
    } else {
      setProcessedWallet(null);
    }
  }, [selectedWallet]);

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }, [])
  );

  useEffect(() => {
    checkPaymentPasswordStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkPaymentPasswordStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const checkPaymentPasswordStatus = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.checkPaymentPasswordStatus(deviceId);
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

  const checkForUpdates = async () => {
    if (isCheckingUpdate) return;
    
    setIsCheckingUpdate(true);
    
    try {
      console.log('Starting update check...');
      
      // Important: Ensure ToastView is rendered
      setTimeout(() => {
        // Check if in development environment
        if (__DEV__) {
          console.log('In development mode, skipping update check');
          Toast.show("Update checking not available in dev mode", "info");
          setIsCheckingUpdate(false);
          return;
        }
        
        // Update check logic
        (async () => {
          try {
            Toast.show("Checking for updates...", "pending");
            
            const update = await Updates.checkForUpdateAsync();
            console.log('Update check result:', update);
            
            if (update.isAvailable) {
              console.log('Update is available');
              Toast.hide();
              Toast.show("Update available, downloading...", "pending");
              
              try {
                await Updates.fetchUpdateAsync();
                console.log('Update downloaded successfully');
                Toast.hide();
                Toast.show("Update ready to install", "success");
                
                setTimeout(() => {
                  Alert.alert(
                    "Update Ready",
                    "The update has been downloaded. Restart now to apply the changes?",
                    [
                      { text: "Later", style: "cancel" },
                      { text: "Restart Now", onPress: () => Updates.reloadAsync() }
                    ]
                  );
                }, 2000);
              } catch (error) {
                console.error('Update download error:', error);
                Toast.hide();
                Toast.show("Failed to download update", "error");
              }
            } else {
              console.log('No updates available');
              Toast.hide();
              Toast.show("You're already on the latest version", "success");
            }
          } catch (error) {
            console.error('Update check error:', error);
            Toast.hide();
            Toast.show("Failed to check for updates", "error");
          } finally {
            setIsCheckingUpdate(false);
          }
        })();
      }, 300); // Increased delay to ensure UI update
    } catch (error) {
      console.error('Unexpected error:', error);
      Toast.hide();
      Toast.show("An error occurred", "error");
      setIsCheckingUpdate(false);
    }
  };
  
  // 处理下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // 使用 loadWallets 替代 fetchWallets
      if (typeof loadWallets === 'function') {
        await loadWallets();
      } else {
        // 备选刷新方法
        await refreshWalletData();
      }
      
      // 更新用户积分信息
      await loadUserPoints();
      
      // 触发子组件刷新
      setRefreshTrigger(prev => prev + 1);
      
      // 检查推荐系统信息（用于调试）
      if (__DEV__) {
        await checkReferralSystemInfo();
      }
      
    } catch (error) {
      console.error('刷新设置页面失败:', error);
      Alert.alert('刷新失败', '请检查网络连接后重试');
    } finally {
      setRefreshing(false);
    }
  }, [loadWallets]);
  
  // 备选的钱包刷新函数
  const refreshWalletData = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      // 直接使用 API 获取钱包列表
      await api.getWallets(deviceId);
      console.log('钱包数据已刷新');
    } catch (error) {
      console.error('刷新钱包数据失败:', error);
      throw error; // 重新抛出错误以便上层捕获
    }
  };
  
  // 加载用户积分
  const loadUserPoints = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      const result = await api.getPoints(deviceId);
      
      if (result && result.status === 'success') {
        setUserPoints(result.data.total_points || 0);
        console.log('【设置页面】加载到用户积分:', result.data.total_points);
      }
    } catch (error) {
      console.error('加载用户积分失败:', error);
    }
  };
  
  // 检查推荐系统信息（开发环境下的调试功能）
  const checkReferralSystemInfo = async () => {
    try {
      // 只保留推荐统计的获取
      const deviceId = await DeviceManager.getDeviceId();
      const stats = await api.getReferralStats(deviceId);
      console.log('【设置页面】推荐统计信息:', stats);
    } catch (error) {
      console.error('检查推荐系统信息失败:', error);
    }
  };
  
  // 首次加载时获取用户积分
  React.useEffect(() => {
    loadUserPoints();
  }, []);
  
  // 添加图片加载错误状态
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  
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
            {selectedWallet?.avatar ? (
              <Image 
                source={{ uri: selectedWallet.avatar }} 
                style={styles.walletAvatar}
                onError={(error) => {
                  console.error('头像加载失败:', error.nativeEvent);
                  setAvatarLoadError(true);
                }}
              />
            ) : (
              <View style={[styles.walletAvatar, { 
                backgroundColor: '#4A6FFF', 
                justifyContent: 'center', 
                alignItems: 'center' 
              }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                  {selectedWallet?.name ? selectedWallet.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
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

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4A6FFF"
              colors={['#4A6FFF', '#2E5BFF']}
              progressBackgroundColor="#171C32"
            />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rewards & Referrals</Text>
            
            {/* 传递积分和刷新状态给组件 */}
            <PointsAndReferralCard 
              setPointsInfoModalVisible={setPointsInfoModalVisible}
              navigation={navigation}
              externalUserPoints={userPoints}
              refreshing={refreshing}
              forceRefresh={refreshTrigger}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <TouchableOpacity 
              style={[styles.menuItem, { backgroundColor: 'rgba(46, 44, 70, 0.8)' }]}
              onPress={handleSetPaymentPassword}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#1FC595' }]}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemText}>
                  {hasPaymentPassword ? 'Change Password' : 'Set Password'}
                </Text>
              </View>
              <View style={styles.menuItemRight}>
                <Ionicons name="chevron-forward" size={20} color="#8E8E8E" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <TouchableOpacity 
              style={[styles.menuItem, { backgroundColor: 'rgba(46, 44, 70, 0.8)' }]}
              onPress={checkForUpdates}
              disabled={isCheckingUpdate}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#5856D6' }]}>
                  <Ionicons name="information" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemText}>Version</Text>
              </View>
              <View style={styles.menuItemRight}>
                <Text style={styles.versionText}>
                  {Constants.expoConfig.version} (Build {BUILD_NUMBER})
                </Text>
                {isCheckingUpdate ? (
                  <ActivityIndicator size="small" color="#1FC595" style={{ marginLeft: 8 }} />
                ) : (
                  <Ionicons name="refresh" size={20} color="#1FC595" style={{ marginLeft: 8 }} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      
      {/* 积分信息模态框 */}
      <PointsInfoModal
        visible={pointsInfoModalVisible}
        onClose={() => setPointsInfoModalVisible(false)}
      />
      
      {/* 在 SafeAreaView 的最后添加 ToastView */}
      <ToastView />
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
    backgroundColor: 'rgba(46, 44, 70, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E8E',
    marginRight: 8,
  },
  pointsReferralCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pointsSection: {
    padding: 18,
    height: 110,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pointsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoButton: {
    padding: 4,
  },
  pointsValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    height: 36,
  },
  pointsValueWrapper: {
    minWidth: 50,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  pointsValueText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 111, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewHistoryText: {
    fontSize: 12,
    color: '#4A6FFF',
    marginRight: 3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 12,
  },
  referralSection: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 68,
  },
  linkContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#CCCCCC',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  updateIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  updateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  updateMessage: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    width: '48%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  laterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  updateButton: {
    overflow: 'hidden',
  },
  updateButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointsInfoModalContainer: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  pointsInfoGradient: {
    width: '100%',
    paddingTop: 16,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsInfoContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rewardText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  pointsContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  benefitItem: {
    width: '48%',
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  benefitText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  policyText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 8,
    lineHeight: 16,
  },
  doneButton: {
    marginTop: 12,
    marginHorizontal: 20,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default SettingsScreen;