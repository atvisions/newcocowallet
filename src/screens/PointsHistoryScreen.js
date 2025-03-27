import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { DeviceManager } from '../utils/device';
import { format } from 'date-fns';

const PointsHistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [historyData, setHistoryData] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const insets = useSafeAreaInsets();
  const [isLoadingRef] = useState({ current: false });

  useEffect(() => {
    loadPointsHistory();
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  const loadPointsHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      } else if (!isRefresh && !hasMore) {
        return;
      } else {
        setLoading(true);
      }

      const deviceId = await DeviceManager.getDeviceId();
      const currentPage = isRefresh ? 1 : page;
      
      // 获取用户总积分
      const pointsResponse = await api.getPoints(deviceId);
      if (pointsResponse.status === 'success') {
        setTotalPoints(pointsResponse.data.total_points || 0);
      }
      
      // 获取积分历史
      const response = await api.getPointsHistory(deviceId, currentPage, 10);
      console.log('Points history response:', {
        status: response.data.status,
        items: response.data.data.items,
        total: response.data.data.total,
        pages: response.data.data.pages,
        currentPage: response.data.data.current_page
      });
      
      if (response.data.status === 'success' && response.data.data) {
        const { items, total, pages, current_page } = response.data.data;
        
        if (Array.isArray(items)) {
          if (isRefresh) {
            // 刷新时直接替换数据
            setHistoryData(items);
          } else {
            // 加载更多时追加数据，使用函数形式避免闭包问题
            setHistoryData(prevData => {
              // 检查是否有重复数据
              const newItems = items.filter(newItem => 
                !prevData.some(existingItem => 
                  existingItem.created_at === newItem.created_at && 
                  existingItem.action_type === newItem.action_type
                )
              );
              return [...prevData, ...newItems];
            });
          }
          
          setHasMore(current_page < pages);
          setPage(current_page + 1);
        }
      }
    } catch (error) {
      console.error('Failed to load points history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    // 防止重复请求
    if (isLoadingRef.current || refreshing) {
      return;
    }
    
    isLoadingRef.current = true;
    try {
      await loadPointsHistory(true);
    } finally {
      isLoadingRef.current = false;
    }
  }, [refreshing]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPointsHistory();
    }
  };

  // 创建一个独立的图标组件
  const ActionIcon = ({ name, color }) => (
    <View style={styles.historyIconContainer}>
      <Text>
        <Ionicons name={name} size={20} color={color} />
      </Text>
    </View>
  );

  // 修改 renderActionIcon 函数
  const renderActionIcon = (actionType) => {
    const iconConfig = {
      name: getIconName(actionType),
      color: getIconColor(actionType)
    };
    
    return <ActionIcon {...iconConfig} />;
  };

  const getIconName = (actionType) => {
    switch(actionType) {
      case 'DOWNLOAD_REFERRAL':
        return "download-outline";
      case 'WALLET_CREATION_REFERRAL':
        return "wallet-outline";
      case 'SHARE_TOKEN':
        return "share-social-outline";
      case 'FIRST_TRANSFER':
        return "paper-plane-outline";
      case 'FIRST_SWAP':
        return "swap-horizontal-outline";
      case 'DAILY_CHECK_IN':
        return "calendar-outline";
      case 'TASK_COMPLETE':
      default:
        return "star-outline";
    }
  };

  const getIconColor = (actionType) => {
    switch(actionType) {
      case 'DOWNLOAD_REFERRAL':
      case 'FIRST_TRANSFER':
        return "#4A6FFF";
      case 'WALLET_CREATION_REFERRAL':
      case 'FIRST_SWAP':
        return "#F7B84B";
      case 'SHARE_TOKEN':
      case 'DAILY_CHECK_IN':
      case 'TASK_COMPLETE':
      default:
        return "#1FC595";
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy • HH:mm');
    } catch (error) {
      return dateString;
    }
  };

  const getActionTitle = (actionType, actionDisplay) => {
    if (actionDisplay) return actionDisplay;
    
    switch(actionType) {
      case 'DOWNLOAD_REFERRAL':
        return 'App Download';
      case 'WALLET_CREATION_REFERRAL':
        return 'Wallet Creation';
      case 'SHARE_TOKEN':
        return 'Token Share';
      case 'FIRST_TRANSFER':
        return 'First Transfer';
      case 'FIRST_SWAP':
        return 'First Swap';
      case 'DAILY_CHECK_IN':
        return 'Daily Check-in';
      case 'TASK_COMPLETE':
        return 'Task Completed';
      default:
        return 'Points Earned';
    }
  };

  const getDescriptionText = (description, actionType) => {
    // 如果是 "Completed task: XXX" 或 "完成任务：XXX" 格式，提取任务名称
    if (description) {
      const match = description.match(/Completed task: (.*)|完成任务：(.*)/);
      if (match) {
        return match[1] || match[2];  // 返回捕获的任务名称
      }
      return description;
    }
    
    // 默认描述
    switch(actionType) {
      case 'DAILY_CHECK_IN':
        return 'Daily check-in reward';
      case 'FIRST_TRANSFER':
        return 'First transfer completed';
      case 'FIRST_SWAP':
        return 'First swap completed';
      case 'SHARE_TOKEN':
        return 'Token share reward';
      default:
        return 'Task completed';
    }
  };

  const getActualTaskType = (description, actionType) => {
    if (actionType !== 'TASK_COMPLETE') return actionType;
    
    // 从描述中解析任务类型
    if (description.includes('Daily Check-in') || description.includes('每日签到')) {
      return 'DAILY_CHECK_IN';
    }
    if (description.includes('First Transfer') || description.includes('首次转账')) {
      return 'FIRST_TRANSFER';
    }
    if (description.includes('First Swap') || description.includes('首次兑换')) {
      return 'FIRST_SWAP';
    }
    if (description.includes('Share Token') || description.includes('分享代币')) {
      return 'SHARE_TOKEN';
    }
    
    return actionType;
  };

  // 修改 renderItem 函数
  const renderItem = ({ item }) => {
    const actualTaskType = getActualTaskType(item.description, item.action_type);
    
    return (
      <View style={styles.historyItem}>
        {renderActionIcon(actualTaskType)}
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle}>
            {getActionTitle(actualTaskType, item.action_display)}
          </Text>
          <Text style={styles.historyDescription}>
            {getDescriptionText(item.description, actualTaskType)}
          </Text>
          <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.historyPoints}>+{item.points}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4A6FFF" />
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="star-outline" size={40} color="#8E8E8E" />
        <Text style={styles.emptyText}>No points history yet</Text>
        <Text style={styles.emptySubText}>
          Complete tasks to earn points!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2C2941', '#171C32']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      <View style={[styles.content, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Points History</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.pointsSummary}>
          <View style={styles.pointsInfoContainer}>
            <Text style={styles.totalPointsLabel}>Total Points</Text>
            <Text style={styles.totalPointsValue}>{totalPoints}</Text>
          </View>
        </View>
        
        <View style={styles.historyOuterContainer}>
          <View style={styles.historyContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            
            <FlatList
              data={historyData}
              renderItem={renderItem}
              keyExtractor={(item, index) => `history-${index}-${item.created_at}`}
              contentContainerStyle={[
                styles.historyList,
                historyData.length === 0 && { flex: 1 }
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#4A6FFF"
                  colors={['#4A6FFF']}
                  enabled={!isLoadingRef.current}
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmptyComponent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

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
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  pointsSummary: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pointsInfoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  totalPointsLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  totalPointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  historyOuterContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
    paddingTop: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyList: {
    paddingBottom: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 13,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#8E8E8E',
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1FC595',
    marginLeft: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
    lineHeight: 20,
  },
  iconText: {
    height: 20,  // 确保图标容器有固定高度
    lineHeight: 20,  // 与高度相同，确保垂直居中
    textAlign: 'center',  // 水平居中
  }
});

export default PointsHistoryScreen; 