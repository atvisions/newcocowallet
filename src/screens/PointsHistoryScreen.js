import React, { useState, useEffect } from 'react';
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
      const historyResponse = await api.getPointsHistory(deviceId, currentPage, 10);
      console.log('Points history response:', JSON.stringify(historyResponse));
      
      // 解析嵌套的响应结构
      // 从日志看，API 返回的数据结构是 {success, data: {status, data: {total, page, page_size, results}}, message}
      // 而代码中期望的结构是 {status, data: {total, page, page_size, results}}
      if (historyResponse.success && historyResponse.data && historyResponse.data.status === 'success') {
        const responseData = historyResponse.data.data;
        const { results, total } = responseData;
        
        // 确保结果是数组
        const validResults = Array.isArray(results) ? results : [];
        
        if (isRefresh) {
          setHistoryData(validResults);
        } else {
          setHistoryData(prevData => [...prevData, ...validResults]);
        }
        
        setHasMore(currentPage * 10 < total);
        setPage(currentPage + 1);
      } else {
        console.error('Failed to load points history, invalid response:', historyResponse);
      }
    } catch (error) {
      console.error('Failed to load points history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadPointsHistory(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPointsHistory();
    }
  };

  const renderActionIcon = (actionType) => {
    switch(actionType) {
      case 'DOWNLOAD_REFERRAL':
        return <Ionicons name="download-outline" size={20} color="#4A6FFF" />;
      case 'WALLET_CREATION_REFERRAL':
        return <Ionicons name="wallet-outline" size={20} color="#F7B84B" />;
      default:
        return <Ionicons name="star-outline" size={20} color="#1FC595" />;
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
    // 使用 action_display 作为首选，如果没有则回退到基于 action_type 的处理
    if (actionDisplay) return actionDisplay;
    
    switch(actionType) {
      case 'DOWNLOAD_REFERRAL':
        return 'App Download';
      case 'WALLET_CREATION_REFERRAL':
        return 'Wallet Creation';
      default:
        return 'Points Earned';
    }
  };

  const getDescriptionText = (description, actionType) => {
    if (!description) {
      switch(actionType) {
        case 'DOWNLOAD_REFERRAL':
          return 'Someone downloaded the app using your referral link';
        case 'WALLET_CREATION_REFERRAL':
          return 'Someone created a wallet using your referral';
        default:
          return 'Points earned from referral activity';
      }
    }
    
    // 从 "User web_4bd03106 downloaded app" 截取用户ID部分
    if (description.includes("User") && description.includes("downloaded app")) {
      const userId = description.split(" ")[1];
      return `User ${userId.substring(0, 8)}... downloaded app`;
    }
    
    return description;
  };

  const renderItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIconContainer}>
        {renderActionIcon(item.action_type)}
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyTitle}>
          {getActionTitle(item.action_type, item.action_display)}
        </Text>
        <Text style={styles.historyDescription}>
          {getDescriptionText(item.description, item.action_type)}
        </Text>
        <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.historyPoints}>+{item.points}</Text>
    </View>
  );

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
          Invite friends to download the app and earn points!
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
});

export default PointsHistoryScreen; 