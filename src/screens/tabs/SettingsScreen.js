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

// 添加任务说明模态框组件
const TaskInfoModal = ({ visible, onClose, task }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.taskInfoModalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.taskInfoGradient}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{task?.name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#8E8E8E" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.taskInfoContent}>
              <Text style={styles.taskDescription}>{task?.description}</Text>
              <View style={styles.taskRewardContainer}>
                <FontAwesome name="star" size={14} color="#F7B84B" style={{marginRight: 6}} />
                <Text style={styles.taskRewardText}>Reward: {task?.points} points</Text>
              </View>
            </View>
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

// 修改为任务卡片组件
const TasksCard = ({ navigation, tasks = [], refreshing, onRefresh }) => {
  const [showTaskInfo, setShowTaskInfo] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // 修改renderTaskIcon函数
  const renderTaskIcon = (taskCode, task) => {
    if (taskCode === 'DAILY_CHECK_IN') {
      return (
        <View style={[styles.taskIconContainer, { backgroundColor: '#1FC59520' }]}>
          <Ionicons name="calendar" size={20} color="#1FC595" />
        </View>
      );
    } else if (taskCode === 'SHARE_TOKEN' && task?.token_data) {
      return (
        <View style={[styles.taskIconContainer, { backgroundColor: '#4A6FFF20' }]}>
          <Image 
            source={{ uri: task.token_data.token_logo }} 
            style={styles.tokenLogo}
            defaultSource={defaultTokenImage}
          />
        </View>
      );
    }
    
    return (
      <View style={[styles.taskIconContainer, { backgroundColor: '#F7B84B20' }]}>
        <FontAwesome name="star" size={20} color="#F7B84B" />
      </View>
    );
  };

  // 修改renderTaskButton函数
  const renderTaskButton = (task) => {
    const isCompleted = task.is_completed;
    const isDisabled = !task.is_active;
    
    // 根据任务类型和状态返回不同的按钮配置
    const getButtonConfig = () => {
      // 分享代币任务
      if (task.code === 'SHARE_TOKEN') {
        if (isCompleted) {
          return {
            text: 'Done',
            colors: ['#1FC595', '#18A67E'],
            icon: <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{marginRight: 4}} />
          };
        }
        if (!task.is_active) {
          return {
            text: 'Coming Soon',
            colors: ['#8E8E8E', '#666666'],
            icon: null
          };
        }
        return {
          text: 'Retweet',
          colors: ['#4A6FFF', '#2E5BFF'],
          icon: <Ionicons name="logo-twitter" size={16} color="#FFFFFF" style={{marginRight: 4}} />
        };
      }
      
      // 每日签到任务
      if (task.code === 'DAILY_CHECK_IN') {
        if (isCompleted) {
          return {
            text: 'Done',
            colors: ['#1FC595', '#18A67E'],
            icon: <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{marginRight: 4}} />
          };
        }
        if (!task.is_active) {
          return {
            text: 'Coming Soon',
            colors: ['#8E8E8E', '#666666'],
            icon: null
          };
        }
        return {
          text: 'Claim',
          colors: ['#4A6FFF', '#2E5BFF'],
          icon: null
        };
      }

      // 首次转账任务
      if (task.code === 'FIRST_TRANSFER') {
        if (isCompleted) {
          return {
            text: 'Done',
            colors: ['#1FC595', '#18A67E'],
            icon: <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{marginRight: 4}} />
          };
        }
        return {
          text: 'Go Transfer',
          colors: ['#4A6FFF', '#2E5BFF'],
          icon: null
        };
      }

      // 首次Swap任务
      if (task.code === 'FIRST_SWAP') {
        if (isCompleted) {
          return {
            text: 'Done',
            colors: ['#1FC595', '#18A67E'],
            icon: <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{marginRight: 4}} />
          };
        }
        return {
          text: 'Go Swap',
          colors: ['#4A6FFF', '#2E5BFF'],
          icon: null
        };
      }
      
      // 默认按钮样式
      if (isCompleted) {
        return {
          text: 'Done',
          colors: ['#1FC595', '#18A67E'],
          icon: <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{marginRight: 4}} />
        };
      }
      if (!task.is_active) {
        return {
          text: 'Coming Soon',
          colors: ['#8E8E8E', '#666666'],
          icon: null
        };
      }
      return {
        text: 'Complete',
        colors: ['#4A6FFF', '#2E5BFF'],
        icon: null
      };
    };

    const buttonConfig = getButtonConfig();
    const isButtonDisabled = isDisabled || isCompleted;

    return (
      <TouchableOpacity 
        style={[
          styles.taskButton,
          isButtonDisabled ? styles.taskButtonDisabled : null,
          isCompleted ? styles.taskButtonCompleted : null
        ]}
        disabled={isButtonDisabled}
        onPress={() => handleTaskAction(task)}
      >
        <LinearGradient
          colors={buttonConfig.colors}
          style={styles.taskButtonGradient}
        >
          <View style={styles.taskButtonContent}>
            {buttonConfig.icon}
            <Text style={styles.taskButtonText}>{buttonConfig.text}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // 修改handleTaskAction函数来处理新的任务类型
  const handleTaskAction = async (task) => {
    switch (task.code) {
      case 'DAILY_CHECK_IN':
        handleDailyCheckIn();
        break;
      case 'SHARE_TOKEN':
        handleShareToken(task);
        break;
      case 'FIRST_TRANSFER':
        navigation.navigate('Send');
        break;
      case 'FIRST_SWAP':
        // 先检查任务状态
        const deviceId = await DeviceManager.getDeviceId();
        const taskStatus = await api.checkTaskStatus(deviceId, 'FIRST_SWAP');
        
        if (taskStatus?.data?.is_completed) {
          // 如果后端显示任务已完成，刷新列表
          onRefresh();
        } else {
          // 否则导航到 Swap 页面
          navigation.navigate('Swap');
        }
        break;
      default:
        console.log('未知任务类型:', task.code);
    }
  };

  // 处理每日签到
  const handleDailyCheckIn = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.dailyCheckIn(deviceId);
      
      if (response.status === 'success') {
        Toast.show(response.message, 'success');
        onRefresh(); // 刷新任务列表和积分
      } else {
        Toast.show(response.message || '签到失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('签到失败:', error);
      Toast.show('签到失败，请稍后重试', 'error');
    }
  };

  // 修改 handleShareToken 函数
  const handleShareToken = async (task) => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      
      // 1. 检查是否有官方推文ID
      const officialTweetId = task.token_data?.official_tweet_id;
      if (!officialTweetId) {
        Toast.show('Invalid tweet ID', 'error');
        return;
      }

      // 2. 构建引用推文的文本和URL
      const tweetText = encodeURIComponent(
        `Check out ${task.token_data.token_name} ($${task.token_data.token_symbol}) on Coco Wallet! 🚀\n#cocoswap`
      );
      
      // 使用 quote tweet URL 格式
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=https://twitter.com/i/status/${officialTweetId}`;

      try {
        // 3. 打开 Twitter 进行引用转发
        await Linking.openURL(twitterUrl);

        // 4. 验证分享
        setTimeout(async () => {
          try {
            const response = await api.verifyShare({
              device_id: deviceId,
              token_address: task.token_data.token_address,
              tweet_id: officialTweetId
            });

            if (response?.status === 'success') {
              Toast.show(`Share successful! Earned ${response.data.points_awarded} points`, 'success');
              onRefresh();
            } else {
              Toast.show(response?.message || 'Share verification failed', 'error');
            }
          } catch (error) {
            console.log('Share verification failed:', error);
            // 不要在用户取消分享时显示错误提示
            if (error?.response?.status !== 400) {
              Toast.show('Share verification failed', 'error');
            }
          }
        }, 5000);

      } catch (error) {
        // 不要在用户取消分享时显示错误提示
        if (!error.message.includes('cancel')) {
          Toast.show('Failed to open Twitter', 'error');
        }
      }

    } catch (error) {
      console.log('Share failed:', error);
      Toast.show('Share failed', 'error');
    }
  };

  return (
    <LinearGradient
      colors={['#2E2C46', '#1A1C2E']}
      style={styles.taskCard}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Ionicons name="star" size={16} color="#F7B84B" style={{marginRight: 8}} />
          <Text style={styles.taskTitle}>Available Tasks</Text>
        </View>
      </View>

      {refreshing ? (
        <ActivityIndicator color="#4A6FFF" style={{padding: 20}} />
      ) : (
        <View style={styles.taskList}>
          {/* 每日签到任务 */}
          {tasks.find(task => task.code === 'DAILY_CHECK_IN') && (
            <View style={styles.taskItem}>
              {renderTaskIcon('DAILY_CHECK_IN')}
              <View style={styles.taskContent}>
                <View style={styles.taskInfo}>
                  <View style={styles.taskNameContainer}>
                    <Text style={styles.taskName}>Daily Check-in</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedTask(tasks.find(task => task.code === 'DAILY_CHECK_IN'));
                        setShowTaskInfo(true);
                      }}
                      style={styles.infoButton}
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#8E8E8E" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pointsContainer}>
                    <FontAwesome name="star" size={12} color="#F7B84B" style={{marginRight: 4}} />
                    <Text style={styles.taskPoints}>+{tasks.find(task => task.code === 'DAILY_CHECK_IN').points}</Text>
                    {tasks.find(task => task.code === 'DAILY_CHECK_IN').today_count !== undefined && (
                      <Text style={styles.sharedCount}>
                        ({tasks.find(task => task.code === 'DAILY_CHECK_IN').today_count}/
                        {tasks.find(task => task.code === 'DAILY_CHECK_IN').daily_limit})
                      </Text>
                    )}
                  </View>
                </View>
                {renderTaskButton(tasks.find(task => task.code === 'DAILY_CHECK_IN'))}
              </View>
            </View>
          )}

          {/* 其他任务 - 过滤掉已完成的非重复性任务和邀请好友任务 */}
          {tasks.filter(task => {
            // 保留以下任务：
            // 1. 未完成的任务
            // 2. 可重复的任务（is_repeatable 为 true）
            // 3. 不是每日签到任务
            // 4. 不是邀请好友任务
            // 5. 不是已完成的首次转账和首次Swap任务
            return (
              (!task.is_completed || task.is_repeatable) && 
              task.code !== 'DAILY_CHECK_IN' &&
              task.code !== 'INVITE_DOWNLOAD' &&  // 添加这个条件
              !(task.is_completed && (task.code === 'FIRST_SWAP' || task.code === 'FIRST_TRANSFER'))
            );
          }).map((task, index) => (
            <View key={`task-${index}`} style={styles.taskItem}>
              {renderTaskIcon(task.code, task)}
              <View style={styles.taskContent}>
                <View style={styles.taskInfo}>
                  <View style={styles.taskNameContainer}>
                    <Text style={styles.taskName}>{task.name}</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedTask(task);
                        setShowTaskInfo(true);
                      }}
                      style={styles.infoButton}
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#8E8E8E" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pointsContainer}>
                    <FontAwesome name="star" size={12} color="#F7B84B" style={{marginRight: 4}} />
                    <Text style={styles.taskPoints}>+{task.points}</Text>
                    {task.today_count !== undefined && (
                      <Text style={styles.sharedCount}>
                        ({task.today_count}/{task.daily_limit})
                      </Text>
                    )}
                  </View>
                </View>
                {renderTaskButton(task)}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 任务说明模态框 */}
      <TaskInfoModal 
        visible={showTaskInfo}
        onClose={() => {
          setShowTaskInfo(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
      />
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
  const [tasks, setTasks] = useState([]);
  const [shareTasks, setShareTasks] = useState([]);

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
  
  // 将函数移到组件内部
  const enrichShareTasksWithTokenInfo = useCallback(async (tasks) => {
    try {
      if (!selectedWallet?.id) {
        console.log('No wallet selected, returning original tasks');
        return tasks;
      }

      // 获取所有需要的代币地址
      const tokenAddresses = tasks.map(task => task.token_address);
      
      // 获取代币信息
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.getTokensManagement(
        selectedWallet.id,
        deviceId,
        'solana'
      );

      if (response?.status === 'success' && response.data?.data?.tokens) {
        const tokensMap = response.data.data.tokens.reduce((acc, token) => {
          acc[token.address] = token;
          return acc;
        }, {});

        // 补充代币信息
        return tasks.map(task => ({
          ...task,
          token: tokensMap[task.token_address] || task.token || {
            logo: task.token_logo,
            symbol: task.token_symbol,
            name: task.token_name
          }
        }));
      }
      
      return tasks;
    } catch (error) {
      console.error('Failed to enrich share tasks:', error);
      return tasks;
    }
  }, [selectedWallet?.id]); // 添加依赖

  // 修改 onRefresh 函数
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      const deviceId = await DeviceManager.getDeviceId();
      
      // 获取积分和任务数据
      const [pointsResult, tasksResult, shareTasksResult] = await Promise.all([
        api.getPoints(deviceId),
        api.getTasks(deviceId),
        api.getShareTasks(deviceId)
      ]);

      if (pointsResult?.status === 'success') {
        setUserPoints(pointsResult.data.total_points || 0);
      }

      let allTasks = [];
      
      // 处理普通任务
      if (tasksResult?.data?.data) {
        allTasks = tasksResult.data.data;
      }
      
      // 处理分享任务
      if (shareTasksResult?.data?.data) {
        const shareTasks = shareTasksResult.data.data.map(task => ({
          id: task.id,
          name: `Share ${task.token_symbol}`,
          code: 'SHARE_TOKEN',
          description: `Share ${task.token_name} to earn points`,
          points: task.points,
          daily_limit: task.daily_limit,
          is_repeatable: true,
          is_active: task.is_active,
          is_completed: task.is_completed,
          today_count: task.today_shared,
          token_data: {
            token_address: task.token_address,
            token_symbol: task.token_symbol,
            token_name: task.token_name,
            token_logo: task.token_logo,
            official_tweet_id: task.official_tweet_id
          }
        }));
        
        // 添加所有分享任务
        allTasks = [...allTasks, ...shareTasks];
      }
      
      setTasks(allTasks);
      
    } catch (error) {
      console.log('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);
  
  // 确保在组件加载时调用 onRefresh
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);
  
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

            {/* 添加分享任务卡片，并传递任务数据 */}
            <TasksCard 
              navigation={navigation} 
              tasks={tasks}
              refreshing={refreshing}
              onRefresh={onRefresh}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  taskCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  taskHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taskList: {
    padding: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  taskDescription: {
    fontSize: 13,
    color: '#8E8E8E',
    marginBottom: 6,
    lineHeight: 18,
  },
  taskPoints: {
    fontSize: 13,
    color: '#F7B84B',
    fontWeight: '600',
  },
  taskButtonDisabled: {
    opacity: 1,
  },
  taskButtonCompleted: {
    opacity: 1,
  },
  taskButton: {
    overflow: 'hidden',
    borderRadius: 20,
    width: 88,
    height: 32,
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoButton: {
    marginLeft: 6,
    padding: 2,
  },
  taskRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  taskRewardText: {
    color: '#F7B84B',
    fontSize: 14,
    fontWeight: '500',
  },
  sharedCount: {
    fontSize: 13,
    color: '#8E8E8E',
    marginLeft: 8,
  },
  tokenLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  tokenLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  twitterShareButton: {
    width: 90,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  twitterShareButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  twitterShareButtonDisabled: {
    opacity: 1,
  },
  taskInfoModalContainer: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A3352',
  },
  taskInfoGradient: {
    padding: 20,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taskInfoContent: {
    paddingTop: 16,
  },
  shareTasksContainer: {
    marginTop: 10,
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  shareButtonDisabled: {
    backgroundColor: '#ccc',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SettingsScreen;